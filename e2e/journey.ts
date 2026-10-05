import { expect, type Page } from "@playwright/test";

/**
 * Steps of the guest journey, shared by every spec that walks it.
 *
 * `check`, where taken, runs once on each screen the walk lands on, so a spec
 * for a different screen shape can assert its layout along the way without
 * re-walking the booth itself.
 */

export type ScreenCheck = (page: Page) => Promise<void>;
const noCheck: ScreenCheck = async () => undefined;

export async function fillDetails(page: Page) {
  await page.getByLabel(/your name/i).fill("Aisyah Rahman");
  await page.getByLabel(/email address/i).fill("aisyah@example.com");
  await page.getByRole("button", { name: /I consent/i }).click();
  await page.getByRole("button", { name: "Continue" }).click();
}

/**
 * The frame must keep the picture's shape, never the area's.
 *
 * Compared against the image's own `naturalWidth/naturalHeight` rather than
 * anything the test knows in advance, so it holds for a 9:16 render and for a
 * capture at whatever shape the camera gave. An earlier version of this read
 * the ratio off the `<video>`, which has already unmounted by the review
 * screen — so it silently skipped and asserted nothing at all.
 */
export async function expectFramedWhole(page: Page, alt: string) {
  const measured = await page.getByAltText(alt).evaluate((node) => {
    const image = node as HTMLImageElement;
    const box = image.getBoundingClientRect();
    return {
      rendered: box.width / box.height,
      natural: image.naturalWidth / image.naturalHeight,
    };
  });

  expect(measured.natural).toBeGreaterThan(0);
  // Tolerance covers the border, which `box-sizing: border-box` takes out of
  // the frame — about a percent, and never the difference between one shape
  // and another.
  expect(measured.rendered).toBeCloseTo(measured.natural, 1);
}

/**
 * Picks a theme and answers every question it asks.
 *
 * How many questions there are is a property of the theme — the superhero asks
 * one more than the rest — so this follows the booth rather than assuming a
 * fixed number of screens.
 */
export async function walkTheme(
  page: Page,
  theme: string,
  expectedQuestions: number,
  check: ScreenCheck = noCheck,
) {
  await page.getByRole("button", { name: theme, exact: true }).waitFor();
  await check(page);
  await page.getByRole("button", { name: theme, exact: true }).click();

  // Mood is asked once, straight after the theme and before its own
  // questions, so it is part of every walk rather than a per-theme count.
  await expect(page.getByRole("heading", { name: /how are you feeling/i })).toBeVisible();
  await check(page);
  await page.getByRole("button", { name: "Happy", exact: true }).click();

  for (let answered = 0; answered < expectedQuestions; answered += 1) {
    // Each question is its own screen with its own heading; answering one
    // advances to the next. Cards are addressed by their position within the
    // grid rather than by name, so this survives an operator renaming an
    // option — but the count is asserted, because a theme silently losing its
    // questions is exactly the regression worth catching.
    const cards = page.getByTestId("option-card");
    await cards.first().waitFor({ timeout: 10_000 });
    await check(page);
    await cards.first().click();
  }

  await expect(page.getByRole("button", { name: "Take photo" })).toBeVisible({
    timeout: 10_000,
  });
}

/** Walks capture → review → generating → pick, returning at the result screen. */
export async function shootAndGenerate(page: Page, check: ScreenCheck = noCheck) {
  await expect(page.getByRole("button", { name: "Take photo" })).toBeEnabled({ timeout: 20_000 });
  await check(page);
  await page.getByRole("button", { name: "Take photo" }).click();

  await expect(page.getByRole("button", { name: "Use this photo" })).toBeVisible({
    timeout: 30_000,
  });

  /*
   * The frame has to keep the picture's shape, not the area's.
   *
   * This one is the tall-and-narrow case: the fake camera is 4:3 landscape and
   * the picture area is taller than it is wide. An `aspect-ratio` frame gets
   * this wrong — the max-width clamp resolves the second axis and the ratio is
   * dropped — so the frame silently takes the area's shape and crops the guest.
   * Asserting the rendered ratio is what catches that.
   */
  await expectFramedWhole(page, "Your photo");
  await check(page);

  await page.getByRole("button", { name: "Use this photo" }).click();

  await expect(page.getByRole("heading", { name: /creating your portrait/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /pick your favourite/i })).toBeVisible({
    timeout: 60_000,
  });
  await check(page);

  await page.getByRole("button", { name: "Use this one" }).click();
  await expect(page.getByText(/scan to download/i)).toBeVisible({ timeout: 45_000 });

  // And the short-and-wide case: the finished portrait is always 9:16.
  await expectFramedWhole(page, "Your finished portrait");
  await check(page);
}
