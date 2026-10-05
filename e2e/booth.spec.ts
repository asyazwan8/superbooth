import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { fillDetails, shootAndGenerate, walkTheme } from "./journey";

/**
 * The guest journey, start to finish.
 *
 * These run against the mock image provider, so they exercise every real code
 * path — upload, queue polling, variant selection, overlay compositing, QR
 * delivery — without spending credits or needing a network.
 */

test("a guest goes from the idle screen to a downloadable photo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/tap anywhere to begin/i)).toBeVisible();

  await page.getByRole("button", { name: /tap anywhere to begin/i }).click();
  await page.waitForURL("**/booth");

  await fillDetails(page);

  // 80s asks about an outfit, an accessory and a backdrop.
  await walkTheme(page, "80s", 3);

  await shootAndGenerate(page);

  // The QR must resolve to a real page that actually serves the image.
  const shareUrl = await page.getByText(/^http:\/\/localhost:3000\/p\//).innerText();
  const response = await page.request.get(shareUrl);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("Download photo");

  const download = await page.request.get(`/api/p/${shareUrl.split("/p/")[1]}/download`);
  expect(download.ok()).toBe(true);
  expect(download.headers()["content-disposition"]).toContain("attachment");

  // The delivered file must be exactly 1080x1920: the operator's branding
  // overlay is authored against that canvas, so anything else shifts it.
  const metadata = await sharp(await download.body()).metadata();
  expect({ width: metadata.width, height: metadata.height }).toEqual({
    width: 1080,
    height: 1920,
  });
  expect(metadata.format).toBe("jpeg");
});

test("the details form refuses to continue without consent or a valid email", async ({ page }) => {
  await page.goto("/booth");

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/your name is required/i)).toBeVisible();
  await expect(page.getByText(/please accept the notice/i)).toBeVisible();

  await page.getByLabel(/your name/i).fill("Aisyah");
  await page.getByLabel(/email address/i).fill("not-an-email");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/doesn't look right/i)).toBeVisible();

  // Still on the details step — nothing advanced.
  await expect(page.getByRole("heading", { name: /let's get you set up/i })).toBeVisible();
});

test("back returns through the choice steps without losing the selection", async ({ page }) => {
  await page.goto("/booth");
  await fillDetails(page);

  await page.getByRole("button", { name: "Cyberpunk", exact: true }).click();
  // Mood is asked first, before the theme's own questions.
  await expect(page.getByRole("heading", { name: /how are you feeling/i })).toBeVisible();

  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page.getByRole("heading", { name: /choose your theme/i })).toBeVisible();

  // The earlier choice is still selected, so Back is non-destructive.
  await expect(page.getByRole("button", { name: "Cyberpunk", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  /*
   * And a mood survives a change of theme, where a customisation would not.
   * Mood belongs to the guest; the theme's questions belong to the theme.
   */
  await page.getByRole("button", { name: "Cyberpunk", exact: true }).click();
  await page.getByRole("button", { name: "Serious", exact: true }).click();
  await expect(page.getByRole("heading", { name: /pick your outfit/i })).toBeVisible();

  await page.getByRole("button", { name: "Go back" }).click();
  await page.getByRole("button", { name: "Go back" }).click();
  await page.getByRole("button", { name: "Jungle Ranger", exact: true }).click();
  await expect(page.getByRole("button", { name: "Serious", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a dropped connection never shows the guest a browser error", async ({ page }) => {
  await page.goto("/booth");
  await fillDetails(page);
  await walkTheme(page, "80s", 3);

  await page.getByRole("button", { name: "Take photo" }).click();
  await expect(page.getByRole("button", { name: "Use this photo" })).toBeVisible({
    timeout: 30_000,
  });

  // What a phone on a weak signal does: the request never completes, and the
  // browser throws with its own wording — "Load failed" in Safari, "Failed to
  // fetch" in Chrome. Neither is something a guest should ever read.
  await page.route("**/api/booth/upload", (route) => route.abort("connectionfailed"));
  await page.getByRole("button", { name: "Use this photo" }).click();

  await expect(page.getByRole("heading", { name: /that didn't work/i })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/could not be sent/i)).toBeVisible();

  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/load failed|failed to fetch|networkerror/i);

  // And the guest is not stranded: both ways forward are still offered.
  await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
});

test("the attendant PIN is verified on the server", async ({ page }) => {
  await page.goto("/booth");

  const rejected = await page.request.post("/api/booth/attendant", { data: { pin: "0000" } });
  expect(rejected.status()).toBe(403);

  const accepted = await page.request.post("/api/booth/attendant", { data: { pin: "1234" } });
  expect(accepted.ok()).toBe(true);
});

test("a guest can erase their own photo from the result page", async ({ page }) => {
  await page.goto("/booth");
  await fillDetails(page);
  // The theme with the most questions, so the longest journey is covered too:
  // suit, superpower, accessory and backdrop.
  await walkTheme(page, "Superhero Comicbook", 4);
  await shootAndGenerate(page);

  const shareUrl = await page.getByText(/^http:\/\/localhost:3000\/p\//).innerText();
  await page.goto(shareUrl);

  await page.getByRole("button", { name: /delete my photo and data/i }).click();
  await page.getByRole("button", { name: /yes, delete it/i }).click();
  await expect(page.getByText(/have been deleted/i)).toBeVisible();

  // The link now reports expiry rather than serving the photo.
  await page.goto(shareUrl);
  await expect(page.getByText(/this photo has expired/i)).toBeVisible();
});
