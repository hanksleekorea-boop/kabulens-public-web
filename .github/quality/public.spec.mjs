import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
const widths = [1440, 390, 360];
test('public release remains usable responsive and accessible', async ({ page, baseURL }, testInfo) => {
  const runtimeErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => runtimeErrors.push(`page: ${error.message}`));
  for (const width of widths) {
    await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 });
    const target = new URL(baseURL);
    target.searchParams.set('auditViewport', String(width));
    target.hash = 'today';
    const response = await page.goto(target.href, { waitUntil: 'networkidle' });
    expect(response?.ok(), `public response at ${width}px`).toBeTruthy();
    await expect(page.getByRole('heading', { name: '오늘 확인할 변화' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(dimensions.scrollWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
    if (width < 1000) {
      const controls = await page.locator('button:visible, a:visible').evaluateAll(nodes => nodes.map(node => {
        const rect = node.getBoundingClientRect();
        return {
          label: (node.textContent || node.getAttribute('aria-label') || '').trim(),
          height: rect.height,
          width: rect.width,
          insideViewport: rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
        };
      }).filter(item => item.width > 0 && item.insideViewport));
      expect(controls.filter(item => item.height < 43.5), `touch targets below 44px at ${width}px`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(new URL('#today', baseURL).href, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '기업찾기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '일본 기업 조사 공간' })).toBeVisible();
  await expect(page.locator('#researchStatus')).toContainText('10000건 중 100건 표시');
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = accessibility.violations.filter(item => item.impact === 'critical' || item.impact === 'serious');
  expect(blocking, `serious accessibility issues in ${testInfo.project.name}: ${JSON.stringify(blocking)}`).toEqual([]);
  expect(runtimeErrors, `runtime errors in ${testInfo.project.name}`).toEqual([]);
});

test('public account, QR, local persistence, and PWA assets remain usable without Google', async ({ page, request, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('#today', baseURL).href, { waitUntil: 'networkidle' });
  await page.locator('#accountEntry').click();
  await expect(page).toHaveURL(/#settings$/);
  await expect(page.locator('#myAccount')).toBeVisible();
  await expect(page.locator('#accountSummary')).toContainText('운영 인증 연결을 준비 중');
  await expect(page.locator('#publicQrImage')).toBeVisible();
  await expect(page.locator('#publicQrLink')).toHaveAttribute('href', /kabulens-public-qr\.png$/);
  await page.locator('#accountDisplayName').fill('공개 품질 검사');
  await page.locator('#saveAccountDisplayName').click();
  await page.locator('#accountDailyGoal').selectOption('15');
  await page.locator('#saveAccountPreferences').click();
  await expect(page.locator('#accountPreferenceStatus')).toContainText('하루 목표 15분');
  const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('kabulens.account-preferences.v1')));
  expect(preferences).toEqual({ displayName: '공개 품질 검사', dailyGoal: '15' });
  await page.locator('#openManualBackup').click();
  await expect(page).toHaveURL(/#safety$/);
  await expect(page.getByRole('heading', { name: '자료 보호' })).toBeVisible();
  for (const asset of ['manifest.webmanifest', 'sw.js', 'kabulens-public-qr.png']) {
    const response = await request.get(new URL(asset, baseURL).href);
    expect(response.ok(), `${asset} response`).toBeTruthy();
  }
  const manifest = await (await request.get(new URL('manifest.webmanifest', baseURL).href)).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('./#today');
});
