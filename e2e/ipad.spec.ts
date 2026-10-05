import { expect, test, type Page } from "@playwright/test";
import { fillDetails, shootAndGenerate, walkTheme } from "./journey";

/**
 * The booth on an iPad Air in portrait, at `/ipad-air`.
 *
 * Runs at the iPad's own 820x1180. What matters here is the shape: the stage
 * fills the glass instead of letterboxing a 9:16 one inside it, nothing a
 * guest has to reach is clipped by a stage squarer than the one the booth was
 * composed for, and every reset stays on the iPad's route.
 */

async function stageBox(page: Page) {
  const box = await page.locator("[data-booth-stage]").boundingBox();
  if (!box) throw new Error("No booth stage on the page");
  return box;
}

/** Every control on screen lies wholly inside the stage. */
async function expectControlsOnStage(page: Page) {
  const stage = await stageBox(page);
  const clipped = await page.locator("[data-booth-stage] button").evaluateAll(
    (buttons, s) =>
      buttons
        .map((button) => ({ button, box: button.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && box.height > 0)
        .filter(
          ({ box }) =>
            box.top < s.y - 1 ||
            box.bottom > s.y + s.height + 1 ||
            box.left < s.x - 1 ||
            box.right > s.x + s.width + 1,
        )
        .map(({ button }) => button.getAttribute("aria-label") ?? button.textContent),
    stage,
  );
  expect(clipped).toEqual([]);
}

test("the stage fills an iPad Air screen in portrait", async ({ page }) => {
  await page.goto("/ipad-air");
  await expect(page.getByText(/tap anywhere to begin/i)).toBeVisible();

  const box = await stageBox(page);
  expect(box.x).toBeCloseTo(0, 0);
  expect(box.y).toBeCloseTo(0, 0);
  expect(box.width).toBeCloseTo(820, 0);
  expect(box.height).toBeCloseTo(1180, 0);
});

test("a guest's whole session stays fitted and on the iPad route", async ({ page }) => {
  await page.goto("/ipad-air");
  await expectControlsOnStage(page);

  await page.getByRole("button", { name: /tap anywhere to begin/i }).click();
  await page.waitForURL("**/ipad-air/booth");
  expect((await stageBox(page)).width).toBeCloseTo(820, 0);

  await expectControlsOnStage(page);
  await fillDetails(page);
  await walkTheme(page, "Cyberpunk", 3, expectControlsOnStage);
  await shootAndGenerate(page, expectControlsOnStage);

  // Done resets the booth — back to this route's attract screen, not `/`.
  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForURL((url) => url.pathname === "/ipad-air");
  await expect(page.getByText(/tap anywhere to begin/i)).toBeVisible();
});

test("turned to landscape the stage stays portrait", async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/ipad-air");
  await expect(page.getByText(/tap anywhere to begin/i)).toBeVisible();

  // The profile's widest shape is 4:5, so 820 tall makes 656 wide, centred.
  const box = await stageBox(page);
  expect(box.height).toBeCloseTo(820, 0);
  expect(box.width).toBeCloseTo(656, 0);
  expect(box.x).toBeCloseTo((1180 - 656) / 2, 0);
  await expectControlsOnStage(page);
});

test("the default kiosk is still exactly 9:16 on the same screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/tap anywhere to begin/i)).toBeVisible();

  const box = await stageBox(page);
  expect(box.height).toBeCloseTo(1180, 0);
  expect(box.width).toBeCloseTo((1180 * 9) / 16, 0);
});
