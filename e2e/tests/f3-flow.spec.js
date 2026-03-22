const { test, expect } = require('@playwright/test');
const path = require('path');

const demoImage = path.join(__dirname, '../../frontend/public/clothes-demo/white_tee.webp');

test.describe('F1/F2/F3 browser flows', () => {
  test('signup → insufficient generate → load demo → generate → results', async ({ page }) => {
    const email = `pw_${Date.now()}@e2e.local`;

    await page.goto('/signup');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password (min 6 characters)').fill('testpw12');
    await page.getByPlaceholder('Confirm Password').fill('testpw12');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/generate');
    await expect(page.locator('#generate-weather')).toBeVisible();
    await page.getByLabel('Occasion').selectOption('Casual');
    await page.locator('.generate-chips').getByRole('button', { name: 'Casual' }).first().click();
    const genFailPromise = page.waitForResponse(
      (r) => r.url().includes('/api/outfits/generate') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Generate Outfit' }).click();
    const genFailResp = await genFailPromise;
    const genFailBody = JSON.parse(genFailResp.request().postData() || '{}');
    expect(genFailBody.weather).toBeTruthy();
    await expect(page.locator('.generate-error')).toContainText(/not enough|wardrobe/i, { timeout: 15_000 });

    await page.goto('/dashboard');
    const seedResp = page.waitForResponse(
      (r) => r.url().includes('/api/demo/seed') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /load demo wardrobe/i }).click();
    const seed = await seedResp;
    expect(seed.ok(), `demo seed HTTP ${seed.status}`).toBeTruthy();
    await expect(page.locator('.clothing-card').first()).toBeVisible({ timeout: 20_000 });

    await page.goto('/generate');
    await expect(page.locator('#generate-weather')).toBeVisible();
    await page.getByLabel('Occasion').selectOption('Weekend');
    await page.locator('.generate-field--vibe .generate-chips').getByRole('button', { name: 'Streetwear' }).click();
    const genOkPromise = page.waitForResponse(
      (r) => r.url().includes('/api/outfits/generate') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Generate Outfit' }).click();
    const genOkResp = await genOkPromise;
    const genOkBody = JSON.parse(genOkResp.request().postData() || '{}');
    expect(genOkBody.weather).toBeTruthy();
    await expect(page).toHaveURL(/\/results$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Recommended Outfit' })).toBeVisible();
    await expect(page.locator('.outfit-card')).toBeVisible();
    await expect(page.locator('.explanation')).toBeVisible();
  });

  test('login → add item (demo asset) → dashboard shows card', async ({ page }) => {
    const email = `pw_item_${Date.now()}@e2e.local`;

    await page.goto('/signup');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password (min 6 characters)').fill('testpw12');
    await page.getByPlaceholder('Confirm Password').fill('testpw12');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/add-item');
    await page.locator('input[type="file"]').setInputFiles(demoImage);
    await expect(page.locator('.additem-preview-img')).toBeVisible({ timeout: 30_000 });
    await page.getByLabel('Type').selectOption('T-Shirt');
    await page.getByLabel('Color').selectOption('White');
    await page.getByLabel('Season').selectOption('All Season');
    await page.getByLabel('Style').selectOption('Casual');
    await page.getByRole('button', { name: 'Save Item' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
    await expect(page.locator('.clothing-card')).toContainText(/T-Shirt/i);
  });
});
