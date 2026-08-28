import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const widths=[1440,390,360];

test('Stock Scanner public release is responsive functional and accessible',async({page,request,baseURL},testInfo)=>{
  const errors=[];
  page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`);});
  page.on('pageerror',error=>errors.push(`page: ${error.message}`));
  expect((await request.get(baseURL)).ok(),'public root response').toBeTruthy();
  for(const width of widths){
    await page.setViewportSize({width,height:width>=1000?900:844});
    await page.goto(new URL('#today',baseURL).href,{waitUntil:'networkidle'});
    await expect(page).toHaveTitle(/Stock Scanner/);
    await expect(page.getByRole('heading',{name:/방법을 비교하고/})).toBeVisible();
    const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(size.scroll,`overflow at ${width}px`).toBeLessThanOrEqual(size.client);
    if(width<1000){
      const small=await page.locator('button:visible,a:visible,input:visible,select:visible').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return{label:(node.textContent||node.getAttribute('aria-label')||'').trim(),height:box.height,width:box.width,inView:box.bottom>0&&box.top<innerHeight&&box.right>0&&box.left<innerWidth};}).filter(item=>item.inView&&item.width>0&&item.height<43.5));
      expect(small,`touch controls below 44px at ${width}`).toEqual([]);
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(new URL('#scan',baseURL).href,{waitUntil:'networkidle'});
  await page.locator('#scanMinScore').selectOption('-100');
  await page.getByRole('button',{name:'상승 후보 찾기'}).click();
  await expect(page.locator('#resultList .result-card').first()).toBeVisible();
  await page.locator('#resultList .result-card').first().click();
  await expect(page.locator('#reportPanel')).toContainText('상승 근거');
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(axe.violations.filter(item=>['critical','serious'].includes(item.impact)),`a11y ${testInfo.project.name}`).toEqual([]);
  expect(errors).toEqual([]);
});

test('Stock Scanner QR policy and PWA assets are public',async({page,request,baseURL})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('#more',baseURL).href,{waitUntil:'networkidle'});
  await expect(page.locator('#publicQrImage')).toBeVisible();
  await expect(page.locator('#publicQrLink')).toHaveAttribute('href',/stock-scanner-qr\.png$/);
  for(const asset of ['stock-scanner.webmanifest','stock-scanner-sw.js','brand.json','stock-scanner-qr.png','legal/terms.html','legal/privacy.html']){
    expect((await request.get(new URL(asset,baseURL).href)).ok(),asset).toBeTruthy();
  }
  const manifest=await(await request.get(new URL('stock-scanner.webmanifest',baseURL).href)).json();
  expect(manifest.name).toBe('Stock Scanner');
  expect(manifest.start_url).toBe('./stock-scanner.html#today');
});
