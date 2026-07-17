import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Smoke + accessibility checks for the public site. These require a running dev
 * server with valid Supabase env (see docs/TESTING_GUIDE.md). They are excluded
 * from the default `vitest` run and executed via `npm run test:e2e`.
 */
test('home page loads and exposes primary navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Admissions/i })).toBeVisible();
});

test('home page has no critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(serious).toEqual([]);
});

test('admin routes redirect anonymous users to login', async ({ page }) => {
  await page.goto('/admin/principal');
  await expect(page).toHaveURL(/\/admin\/login/);
});
