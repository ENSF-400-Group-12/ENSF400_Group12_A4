const { test, expect } = require('@playwright/test');

/**
 * Requires CI=1 (outfit rerank off) for stable local scoring.
 * Uses demo wardrobe; asserts different occasion+vibe pairs don't all collapse to one fingerprint.
 */
test.describe('F3 outfit variety (demo wardrobe)', () => {
  test('multiple occasion+vibe pairs yield distinct outfit fingerprints; clash rejects', async ({ page }) => {
    test.setTimeout(180_000);
    const email = `pw_var_${Date.now()}@e2e.local`;

    await page.goto('/signup');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password (min 6 characters)').fill('testpw12');
    await page.getByPlaceholder('Confirm Password').fill('testpw12');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const seedResp = page.waitForResponse(
      (r) => r.url().includes('/api/demo/seed') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /load demo wardrobe/i }).click();
    expect((await seedResp).ok()).toBeTruthy();
    await expect(page.locator('.clothing-card').first()).toBeVisible({ timeout: 20_000 });

    const pairs = [
      ['Work', 'Formal'],
      ['Work', 'Casual'],
      ['Date Night', 'Formal'],
      ['Date Night', 'Classy'],
      ['School', 'Streetwear'],
      ['Weekend', 'Sporty'],
      ['Outdoor', 'Casual'],
      ['Outdoor', 'Vintage'],
    ];

    const fingerprints = [];
    for (const [occasion, vibe] of pairs) {
      await page.goto('/generate');
      await expect(page.locator('#generate-weather')).toBeVisible();
      await page.getByLabel('Occasion').selectOption(occasion);
      await page.locator('.generate-field--vibe .generate-chips').getByRole('button', { name: vibe }).click();
      await page.getByRole('button', { name: 'Generate Outfit' }).click();
      await expect(page).toHaveURL(/\/results$/, { timeout: 25_000 });
      const types = await page.locator('.outfit-item-type').allTextContents();
      fingerprints.push(`${occasion}|${vibe}|${types.join(',')}`);
    }

    const unique = new Set(fingerprints);
    expect(unique.size, `expected variety, got ${unique.size} unique of ${fingerprints.length}`).toBeGreaterThanOrEqual(4);

    const emailBare = `pw_bare_${Date.now()}@e2e.local`;
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/', { timeout: 15_000 });
    await page.goto('/signup');
    await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Email').fill(emailBare);
    await page.getByPlaceholder('Password (min 6 characters)').fill('testpw12');
    await page.getByPlaceholder('Confirm Password').fill('testpw12');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/generate');
    await expect(page.locator('#generate-weather')).toBeVisible();
    await page.getByLabel('Occasion').selectOption('Casual');
    await page.locator('.generate-field--vibe .generate-chips').getByRole('button', { name: 'Casual' }).first().click();
    await page.getByRole('button', { name: 'Generate Outfit' }).click();
    await expect(page).toHaveURL(/\/generate$/, { timeout: 15_000 });
    await expect(page.locator('.generate-error')).toContainText(/not enough|wardrobe/i, { timeout: 15_000 });
  });
});
