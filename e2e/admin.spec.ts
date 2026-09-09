import { expect, test, type Page } from "@playwright/test";

/**
 * The operator backend.
 *
 * Signs in with the local PIN, which is the fallback used when no Firebase
 * project is configured. With Firebase configured the same session cookie is
 * issued from an ID token, and everything downstream is identical.
 */

/** One event row, addressed by the event's name rather than by DOM position. */
function presetRow(page: Page, name: string) {
  return page.getByTestId("preset-row").filter({ hasText: name });
}

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/attendant pin/i).fill("1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin");
}

test("the backend refuses anonymous access", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  const api = await page.request.get("/api/admin/presets");
  expect(api.status()).toBe(401);

  const sessions = await page.request.get("/api/admin/sessions");
  expect(sessions.status()).toBe(401);
});

test("an operator duplicates an event, edits it, and takes it live", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();

  // Remembered so this test can put it back. The local store outlives a run,
  // so leaving a different event live means the next `npm run e2e` walks the
  // booth against a preset whose flow the kiosk specs do not expect.
  const livePresets = await (await page.request.get("/api/admin/presets")).json();
  const previouslyLive = (livePresets.presets as { id: string; isActive: boolean }[]).find(
    (preset) => preset.isActive,
  );

  await presetRow(page, "Superbooth Demo").getByRole("button", { name: "Duplicate" }).click();

  await page.waitForURL(/\/admin\/presets\//);
  await expect(page.getByText(/draft — not live/i)).toBeVisible();

  // Rename it and change the headline the booth shows.
  await page.getByLabel("Event name").fill("KL Launch Night");
  await page.getByLabel(/idle headline/i).fill("Be the poster");
  await expect(page.getByText(/unsaved changes/i)).toBeVisible();

  // Exact, because "Unsaved changes" also contains the word.
  const savedBadge = page.getByText("Saved", { exact: true });

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(savedBadge).toBeVisible();

  // Pin the style step, which should drop a screen from the guest journey.
  const journey = page.getByTestId("guest-journey").getByRole("listitem");
  const journeyBefore = await journey.count();

  await page.getByRole("button", { name: "Styles" }).click();
  await page.getByLabel(/how the guest chooses/i).selectOption("fixed");
  await expect(page.getByText(/skips this step entirely/i)).toBeVisible();
  await expect(journey).toHaveCount(journeyBefore - 1);

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(savedBadge).toBeVisible();

  // Take it live, then confirm the kiosk is actually serving it.
  await page.goto("/admin");
  const row = presetRow(page, "KL Launch Night");
  await row.getByRole("button", { name: "Go live" }).click();

  // Scoped to this row: the previously-live event also renders a "Live" badge,
  // so an unscoped assertion passes instantly and races the activation.
  await expect(row.getByText("Live", { exact: true })).toBeVisible();

  const config = await page.request.get("/api/config");
  const { preset } = (await config.json()) as {
    preset: { name: string; branding: { attractHeadline: string }; flow: { treatment: { mode: string } } };
  };
  expect(preset.name).toBe("KL Launch Night");
  expect(preset.branding.attractHeadline).toBe("Be the poster");
  expect(preset.flow.treatment.mode).toBe("fixed");

  if (previouslyLive) {
    await page.request.post(`/api/admin/presets/${previouslyLive.id}/activate`);
  }
});

test("the live event cannot be deleted out from under the booth", async ({ page }) => {
  await signIn(page);

  const presets = await (await page.request.get("/api/admin/presets")).json();
  const live = (presets.presets as { id: string; isActive: boolean }[]).find(
    (preset) => preset.isActive,
  );
  expect(live).toBeDefined();

  const response = await page.request.delete(`/api/admin/presets/${live!.id}`);
  expect(response.status()).toBe(400);
  expect(await response.text()).toContain("Activate another preset");
});

test("a saved preset cannot make itself live", async ({ page }) => {
  await signIn(page);

  const presets = await (await page.request.get("/api/admin/presets")).json();
  const draft = (presets.presets as { id: string; isActive: boolean }[]).find(
    (preset) => !preset.isActive,
  );
  expect(draft).toBeDefined();

  const full = await (await page.request.get(`/api/admin/presets/${draft!.id}`)).json();
  const response = await page.request.put(`/api/admin/presets/${draft!.id}`, {
    data: { ...full.preset, isActive: true },
  });

  const saved = await response.json();
  expect(saved.preset.isActive).toBe(false);
});

test("the sessions table lists guests and exports them as CSV", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Sessions" }).click();
  await expect(page.getByRole("heading", { name: "Sessions" })).toBeVisible();

  const csv = await page.request.get("/api/admin/sessions?format=csv");
  expect(csv.ok()).toBe(true);
  expect(csv.headers()["content-disposition"]).toContain("attachment");
  expect(await csv.text()).toContain('"created_at"');
});

test("analytics reports a coherent funnel", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  const response = await page.request.get("/api/admin/analytics");
  const { analytics } = (await response.json()) as {
    analytics: { funnel: { step: string; count: number }[] };
  };

  // Every stage must be at least as large as the one after it.
  const counts = analytics.funnel.map((stage) => stage.count);
  for (let index = 1; index < counts.length; index += 1) {
    expect(counts[index]).toBeLessThanOrEqual(counts[index - 1]);
  }
});

test("a test generation honours the style the operator explicitly picked", async ({ page }) => {
  await signIn(page);

  // Self-contained: create a preset with the style pinned rather than relying
  // on state another test happened to leave behind.
  const created = await page.request.post("/api/admin/presets", {
    data: { name: "Pinned style fixture" },
  });
  const { preset } = (await created.json()) as { preset: Record<string, unknown> };

  await page.request.put(`/api/admin/presets/${preset.id}`, {
    data: {
      ...preset,
      flow: {
        ...(preset.flow as object),
        treatment: { mode: "fixed", fixedId: "treatment-3d" },
      },
    },
  });

  const target = preset as { id: string };

  const scene = await page.request.post("/api/admin/generate-scene", {
    data: { description: "a misty pine forest at dawn" },
  });
  const { url } = (await scene.json()) as { url: string };

  // The preset pins 3D, but the operator asked for 2D — the explicit choice
  // must win, or the test tool silently tests the wrong thing.
  const response = await page.request.post("/api/admin/test-generate", {
    data: { presetId: target.id, photoUrl: url, treatmentId: "treatment-2d" },
  });
  const { prompt } = (await response.json()) as { prompt: string };

  expect(prompt).toContain("hand-drawn 2D character illustration");
  expect(prompt).not.toContain("3D animated feature-film");
});

test("the public gallery exposes photos but never personal data", async ({ page }) => {
  const response = await page.request.get("/api/gallery");
  expect(response.ok()).toBe(true);

  const { items } = (await response.json()) as { items: Record<string, unknown>[] };
  for (const item of items) {
    expect(Object.keys(item).sort()).toEqual(["createdAt", "id", "url"]);
  }
});
