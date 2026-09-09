import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

/**
 * The guest journey, start to finish.
 *
 * These run against the mock image provider, so they exercise every real code
 * path — upload, queue polling, variant selection, overlay compositing, QR
 * delivery — without spending credits or needing a network.
 */

async function fillDetails(page: Page) {
  await page.getByLabel(/your name/i).fill("Aisyah Rahman");
  await page.getByLabel(/email address/i).fill("aisyah@example.com");
  await page.getByRole("button", { name: /I consent/i }).click();
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Walks capture → review → generating → pick, returning at the result screen. */
async function shootAndGenerate(page: Page) {
  await expect(page.getByRole("button", { name: "Take photo" })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Take photo" }).click();

  await expect(page.getByRole("button", { name: "Use this photo" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Use this photo" }).click();

  await expect(page.getByRole("heading", { name: /creating your portrait/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /pick your favourite/i })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole("button", { name: "Use this one" }).click();
  await expect(page.getByText(/scan to download/i)).toBeVisible({ timeout: 45_000 });
}

test("a guest goes from the idle screen to a downloadable photo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/tap anywhere to begin/i)).toBeVisible();

  await page.getByRole("button", { name: /tap anywhere to begin/i }).click();
  await page.waitForURL("**/booth");

  await fillDetails(page);

  await page.getByRole("button", { name: "Neon" }).click();
  await page.getByRole("button", { name: "3D", exact: true }).click();

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

  await page.getByRole("button", { name: "Neon" }).click();
  await expect(page.getByRole("heading", { name: /choose a style/i })).toBeVisible();

  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page.getByRole("heading", { name: /choose your scene/i })).toBeVisible();

  // The earlier choice is still selected, so Back is non-destructive.
  await expect(page.getByRole("button", { name: "Neon" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
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
  await page.getByRole("button", { name: "Jungle" }).click();
  await page.getByRole("button", { name: "Superhero" }).click();
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
