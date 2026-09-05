import { expect, test } from '@playwright/test';

test('Real daily data and unverified discovery remain separate at narrow widths',async({page,baseURL})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390,360]){
    await page.setViewportSize({width,height:844});
    await page.goto(new URL('markets.html?q=2330',baseURL).href);
    await expect(page.locator('#marketStatus')).toContainText('1,380');
    await page.locator('#marketRows button').first().click();
    await expect(page.locator('#marketDetail')).toContainText('2,410');
    await expect(page.locator('#marketDetail')).toContainText('2026-09-04');
    await expect(page.locator('#marketDetail')).toContainText('계산하지 않음');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
  }
  await page.locator('#marketMode').selectOption('directory');
  await expect(page.locator('#marketStatus')).toContainText('18,685');
  await page.locator('#marketQuery').fill('Apple');
  await page.locator('#marketSearch').click();
  await expect(page.locator('#marketRows')).toContainText('Apple');
  await expect(page.locator('#marketBoundary')).toContainText('미검증');
  await page.locator('#marketLocale').selectOption('en');
  await expect(page.locator('#marketBoundary')).toContainText('unverified');
  expect(errors).toEqual([]);
});

test('One-week scan returns all rows and fixed-date report links preserve context',async({page,baseURL})=>{
  await page.goto(new URL('stock-scanner.html#scan',baseURL).href);
  await page.locator('#scanHorizon').selectOption('1W');
  await page.locator('details.advanced-filters summary').click();
  await page.locator('#scanMinScore').selectOption('-100');
  await page.locator('#runScan').click();
  await page.locator('#toggleResults').click();
  expect(await page.locator('#resultList .result-card').count()).toBe(240);
  await page.locator('#resultList .result-card').first().click();
  await expect(page).toHaveURL(/#reports$/);
  await expect(page.locator('#mobileReportBody')).toBeVisible();
  await page.goto(new URL('stock-scanner.html?symbol=JP%3AXTKS%3AJPX013&method=M-VALUE-001&horizon=6M&asOf=2026-08-30&model=education-1#reports',baseURL).href);
  await expect(page.locator('#mobileReportBody')).toContainText('2026-08-30');
  await expect(page.locator('#mobileReportBody')).toContainText('6M');
});

test('Practice feedback persists and full device backup preserves all four stores',async({page,baseURL})=>{
  await page.goto(new URL('stock-scanner.html#more',baseURL).href);
  await page.locator('#contentV81Tutorials > article > details > summary').first().click();
  const form=page.locator('form[data-practice="0"]');
  for(let choice=0;choice<4;choice++){
    await form.locator('input[type="radio"]').nth(choice).check();
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-practice-status]')).not.toBeEmpty();
    if((await form.locator('[data-practice-status]').innerText()).includes('Correct.'))break;
  }
  await expect(form.locator('[data-practice-status]')).toContainText('Correct.');
  await page.reload();
  await page.locator('#contentV81Tutorials > article > details > summary').first().click();
  await expect(form.locator('[data-practice-status]')).toContainText('Previous: correct');
  await page.goto(new URL('stock-scanner.html?research=desk#reports',baseURL).href);
  await expect(page.locator('#advancedWorkbench')).toBeVisible();
  await page.waitForFunction(()=>window.StockScannerAdvancedUIReady===true);
  await page.locator('#commercialBoundaryConfirm').check();
  await page.goto(new URL('stock-scanner.html#more',baseURL).href);
  await expect(page.locator('#downloadLocalBackup')).toBeVisible();
  const before=await page.evaluate(()=>window.StockScannerReliability.capture(localStorage));
  expect(Object.values(before).every(value=>value!==null)).toBeTruthy();
  const downloaded=page.waitForEvent('download');
  await page.locator('#downloadLocalBackup').click();
  const download=await downloaded,stream=await download.createReadStream(),chunks=[];
  for await(const chunk of stream)chunks.push(chunk);
  const raw=Buffer.concat(chunks).toString('utf8');
  const backup=JSON.parse(raw);
  expect(backup.schemaVersion).toBe('stock-scanner-device-backup/v2');
  expect(backup.entries).toEqual(before);
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('#deleteLocalData').click();
  expect(await page.evaluate(()=>window.StockScannerReliability.capture(localStorage))).toEqual(before);
  await page.evaluate(()=>localStorage.setItem('stockscanner-test-unrelated','keep'));
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#deleteLocalData').click();
  expect(Object.values(await page.evaluate(()=>window.StockScannerReliability.capture(localStorage))).every(value=>value===null)).toBeTruthy();
  expect(await page.evaluate(()=>localStorage.getItem('stockscanner-test-unrelated'))).toBe('keep');
  await page.locator('#localBackupFile').setInputFiles({name:'device-backup.json',mimeType:'application/json',buffer:Buffer.from(raw,'utf8')});
  await expect(page.locator('#restoreLocalBackup')).toBeEnabled();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#restoreLocalBackup').click();
  expect(await page.evaluate(()=>window.StockScannerReliability.capture(localStorage))).toEqual(before);
});
