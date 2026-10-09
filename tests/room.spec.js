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
  await page.clock.setFixedTime(new Date('2026-10-09T23:59:59Z'));
  await ready(page);
  await expect(page.getByRole('heading', { name: 'rovewyn', level: 1 })).toBeVisible();

  const profile = page.getByRole('button', { name: 'Profile', exact: true });
  await profile.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/rovewyn');
  await page.keyboard.press('Escape');
  await expect(profile).toBeFocused();

  const monitor = page.getByRole('button', { name: /Inspect monitor/i });
  const laptop = page.getByRole('button', { name: /Inspect MacBook/ });
  const mini = page.getByRole('button', { name: /Inspect Mac mini/ });
  await expect(monitor).toBeHidden();
  await expect(laptop).toBeHidden();
  await expect(mini).toBeHidden();
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await monitor.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Monitor', exact: true })).toBeVisible();
  await expect(page.locator('#scan-session-date')).toHaveText('2026-10-09 UTC');
  await expect(page.locator('#captured-fragments tbody tr')).toHaveCount(8);
  await expect(page.locator('#scan-record-progress')).toHaveText('NODE RECORDS · 1/3');
  await page.keyboard.press('Escape');
  await expect(monitor).toBeFocused();
  await monitor.click();
  await expect(page.locator('#scan-record-progress')).toHaveText('NODE RECORDS · 1/3');
  await page.keyboard.press('Escape');

  await mini.click();
  await expect(page.getByRole('heading', { name: 'Mac mini', exact: true })).toBeVisible();
  await expect(page.locator('#calibration-records tbody tr')).toHaveText(['e10', 'k05']);
  await expect(page.locator('#scan-record-progress')).toHaveText('NODE RECORDS · 2/3');
  await page.keyboard.press('Escape');
  await expect(mini).toBeFocused();
  await laptop.click();
  await expect(page.getByRole('heading', { name: 'MacBook', exact: true })).toBeVisible();
  await expect(page.locator('#scan-record-progress')).toHaveText('NODE RECORDS · 3/3');
  const username = page.getByRole('textbox', { name: 'Username', exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await expect(username).toHaveValue('');
  await expect(username).toBeFocused();
  await expect(username).not.toHaveAttribute('placeholder', /.+/);
  await username.fill('other');
  // Solved from the fixed day's route records and calibration, without importing the generator.
  await password.fill('brfmsqgn');
  await password.press('Enter');
  await expect(page.locator('#terminal-login-status')).toHaveText('ACCESS DENIED');
  await username.fill('rovewyn');
  await password.fill('wrong');
  await password.press('Enter');
  await expect(page.locator('#terminal-login-status')).toHaveText('ACCESS DENIED');
  await password.fill('brfmsqgn');
  await password.press('Enter');
  await expect(page.locator('#terminal-login-status')).toHaveText('ACCESS GRANTED');
  await expect(page.getByRole('heading', { name: 'RECOVERED LOG / 001' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to room', exact: true }).last().click();
  await expect(laptop).toBeFocused();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('link', { name: /GitHub/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await expect(monitor).toBeHidden();
  await expect(laptop).toBeHidden();
  await expect(mini).toBeHidden();
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  await expect(page.locator('#scan-progress')).toHaveText('NODE RECORDS · 3/3');
  await laptop.click();
  await expect(page.locator('#terminal-login-status')).toHaveText('ACCESS GRANTED');
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(username).toHaveValue('');
  await expect(password).toHaveValue('');
  await page.clock.setFixedTime(new Date('2026-10-10T00:00:00Z'));
  await expect(page.locator('#scan-session-date')).toHaveText('2026-10-09 UTC');
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

  test('the introduction remains available', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'rovewyn', level: 1 })).toBeVisible();
  });
});
