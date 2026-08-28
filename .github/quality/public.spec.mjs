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
