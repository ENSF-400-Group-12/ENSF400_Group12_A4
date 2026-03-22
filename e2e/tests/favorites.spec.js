const { test, expect } = require('@playwright/test');

/**
 * End-to-end: favorites API must return 200/201 (not 404).
 * Requires backend with favorite_outfits routes + frontend proxy to same backend
 * (see e2e/playwright.config.js webServer + REACT_APP_PROXY_TARGET).
 */
test.describe('Favorites feature', () => {
  test('signup → demo wardrobe → generate → POST favorites 201 → GET favorites 200 → UI shows saved outfit', async ({
    page,
  }) => {
    const email = `pw_fav_${Date.now()}@e2e.local`;

    await page.goto('/signup');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password (min 6 characters)').fill('testpw12');
    await page.getByPlaceholder('Confirm Password').fill('testpw12');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/dashboard');
    const seedResp = page.waitForResponse(
      (r) => r.url().includes('/api/demo/seed') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /load demo wardrobe/i }).click();
    const seed = await seedResp;
    expect(seed.ok(), `demo seed HTTP ${seed.status()}`).toBeTruthy();
    await expect(page.locator('.clothing-card').first()).toBeVisible({ timeout: 20_000 });

    await page.goto('/generate');
    await expect(page.locator('#generate-weather')).toBeVisible();
    await page.getByLabel('Occasion').selectOption('Weekend');
    await page.locator('.generate-field--vibe .generate-chips').getByRole('button', { name: 'Streetwear' }).click();
    const gen1Promise = page.waitForResponse(
      (r) => r.url().includes('/api/outfits/generate') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Generate Outfit' }).click();
    const gen1Resp = await gen1Promise;
    expect(JSON.parse(gen1Resp.request().postData() || '{}').weather).toBeTruthy();
    await expect(page).toHaveURL(/\/results$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Recommended Outfit' })).toBeVisible();

    const savePromise = page.waitForResponse((r) => {
      const u = r.url();
      return u.includes('/api/outfits/favorites') && !u.match(/\/favorites\/\d+/) && r.request().method() === 'POST';
    });
    await page.getByRole('button', { name: /add to favorites/i }).click();
    const saveResp = await savePromise;
    expect(
      saveResp.status(),
      `POST /api/outfits/favorites must exist (201). Got ${saveResp.status()}. Is the backend running latest code with favorites routes?`
    ).toBe(201);

    const listPromise = page.waitForResponse((r) => {
      const u = r.url();
      return u.includes('/api/outfits/favorites') && !u.match(/\/favorites\/\d+/) && r.request().method() === 'GET';
    });
    await page.goto('/favorites');
    const listResp = await listPromise;
    expect(
      listResp.status(),
      `GET /api/outfits/favorites must exist (200). Got ${listResp.status()}.`
    ).toBe(200);

    await expect(page.getByRole('heading', { name: 'Favorites' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Saved outfit' })).toBeVisible();
    await expect(page.locator('.outfit-card').first()).toBeVisible();
    await expect(page.locator('.explanation').first()).toBeVisible();
  });

  test('remove favorite deletes via DELETE and list can be empty', async ({ page }) => {
    const email = `pw_fav_rm_${Date.now()}@e2e.local`;

    await page.goto('/signup');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password (min 6 characters)').fill('testpw12');
    await page.getByPlaceholder('Confirm Password').fill('testpw12');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/dashboard');
    const seedResp = page.waitForResponse(
      (r) => r.url().includes('/api/demo/seed') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /load demo wardrobe/i }).click();
    await seedResp;
    await expect(page.locator('.clothing-card').first()).toBeVisible({ timeout: 20_000 });

    await page.goto('/generate');
    await expect(page.locator('#generate-weather')).toBeVisible();
    await page.getByLabel('Occasion').selectOption('Weekend');
    await page.locator('.generate-field--vibe .generate-chips').getByRole('button', { name: 'Streetwear' }).click();
    const gen1Promise = page.waitForResponse(
      (r) => r.url().includes('/api/outfits/generate') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Generate Outfit' }).click();
    const gen1Resp = await gen1Promise;
    expect(JSON.parse(gen1Resp.request().postData() || '{}').weather).toBeTruthy();
    await expect(page).toHaveURL(/\/results$/, { timeout: 20_000 });

    const savePromise = page.waitForResponse((r) => {
      const u = r.url();
      return u.includes('/api/outfits/favorites') && !u.match(/\/favorites\/\d+/) && r.request().method() === 'POST';
    });
    await page.getByRole('button', { name: /add to favorites/i }).click();
    await savePromise;

    const delPromise = page.waitForResponse(
      (r) => r.url().match(/\/api\/outfits\/favorites\/\d+$/) && r.request().method() === 'DELETE'
    );
    await page.goto('/favorites');
    await expect(page.getByRole('heading', { name: 'Saved outfit' })).toBeVisible({ timeout: 15_000 });
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /^remove$/i }).click();
    const delResp = await delPromise;
    expect(delResp.status()).toBe(204);

    await expect(page.getByText(/have not saved any outfits yet/i)).toBeVisible({ timeout: 10_000 });
  });
});
