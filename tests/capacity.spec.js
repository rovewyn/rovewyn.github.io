import { test, expect } from '@playwright/test';

const articlePath = '/blog/2026/10/10/substrate-browser-capacity/';
const articleName = 'How many browsers fit on a laptop?';

test('the MacBook and blog index lead to the capacity article', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'ready');
  await page.getByRole('button', { name: 'Blog', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const post = dialog.getByRole('link', { name: new RegExp(articleName.replace('?', '\\?')) });
  await expect(post).toHaveAttribute('href', articlePath);
  await expect(post).toHaveAttribute('target', '_blank');
  await expect(dialog.getByRole('link', { name: /A browser that wakes up/ })).toBeVisible();

  await dialog.getByRole('link', { name: /All posts/ }).click();
  await expect(page).toHaveURL('/blog/');
  const indexPost = page.getByRole('link', { name: new RegExp(articleName.replace('?', '\\?')) });
  await expect(indexPost).toHaveAttribute('target', '_blank');
  const popupPromise = page.waitForEvent('popup');
  await indexPost.click();
  const article = await popupPromise;
  await expect(article).toHaveURL(articlePath);
  await expect(article.getByRole('heading', { level: 1 })).toHaveText(articleName);
  await expect(article.locator('#finding')).toContainText('16 browser Actors');
  await article.close();
});

test('the production article loads data and every chart view', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(articlePath);
  await expect(page.locator('#density-table tr')).toHaveCount(6);
  await expect(page.locator('#lifecycle-result')).toContainText('87 out of 87');

  async function loadedImage(id, expectedSrc) {
    const image = page.locator(id);
    if (expectedSrc) await expect(image).toHaveAttribute('src', expectedSrc);
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  }

  await loadedImage('#task img');
  for (const profile of ['default', 'compact']) {
    await page.locator(`[data-profile="${profile}"]`).click();
    await expect(page.locator('#density-table tr')).toHaveCount(profile === 'default' ? 3 : 6);
    for (const metric of ['throughput', 'latency', 'memory', 'cpu']) {
      const button = page.locator(`[data-density="${metric}"]`);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await loadedImage('#density-chart', `charts/density-${profile}-${metric}.svg`);
    }
  }
  for (const metric of ['throughput', 'latency', 'queue', 'cpu']) {
    await page.locator(`[data-rate="${metric}"]`).click();
    await loadedImage('#rate-chart', `charts/rates-${metric}.svg`);
  }
  await loadedImage('#soak-chart', 'charts/soak-8.svg');
  for (const metric of ['latency', 'batch', 'memory', 'transfer', 'io']) {
    await page.locator(`[data-lifecycle="${metric}"]`).click();
    await loadedImage('#lifecycle-chart', `charts/lifecycle-${metric}.svg`);
  }
  for (const cycle of [1, 2, 3]) {
    await page.locator(`[data-burst="${cycle}"]`).click();
    await loadedImage('#burst-chart', `charts/burst-${cycle}.svg`);
    await expect(page.locator('#burst-result')).toContainText(`In cycle ${cycle}`);
  }
  await expect(page.locator('#soak-result')).toContainText('2,400 of 2,400 Tasks');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const dataset = await request.get(`${articlePath}report-data.json`);
  expect(dataset.ok()).toBe(true);
  const data = await dataset.json();
  expect(data.workloadTasks).toBe(5400);
  expect(data.workloadErrors).toBe(0);
  const operationRecord = await request.get(`${articlePath}operation-record.md`);
  expect(operationRecord.ok()).toBe(true);
  expect(await operationRecord.text()).toContain('Original records, logs, and snapshots remain private');
  expect(errors).toEqual([]);
});
