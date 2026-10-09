import { test, expect } from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'ready');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-rendered', 'true');
}

test('profile and scan are usable', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await ready(page);
  await expect(page.getByRole('heading', { name: 'rovewyn', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Find me on GitHub' })).toHaveAttribute('href', 'https://github.com/rovewyn');

  const profile = page.getByRole('button', { name: /Open profile/ });
  await profile.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/rovewyn');
  await page.keyboard.press('Escape');
  await expect(profile).toBeFocused();

  const signal = page.getByRole('button', { name: /Trace the connection/ });
  await expect(signal).toBeHidden();
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await signal.click();
  await expect(page.getByRole('heading', { name: 'Signal found' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to room', exact: true }).last().click();
  await expect(signal).toBeFocused();
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await expect(signal).toBeHidden();
  expect(errors).toEqual([]);
});

test('sound starts muted and can be toggled', async ({ page }) => {
  await ready(page);
  await expect(page.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).not.toHaveAttribute('data-audio', 'running');
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound on', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-audio', 'running');
  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the introduction and GitHub link remain available', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'rovewyn', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Find me on GitHub' })).toHaveAttribute('href', 'https://github.com/rovewyn');
  });
});
