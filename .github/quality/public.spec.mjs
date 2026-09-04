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
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.getByRole('heading',{name:/방법을 비교하고/})).toBeVisible();
    const productText=await page.locator('body').innerText();
    for(const forbidden of ['개발 진척','99/100','남은 1점','미실시','자동검사 상태'])expect(productText).not.toContain(forbidden);
    expect(await page.locator('a[href="dashboard.html"],a[href="free-launch-readiness.json"],a[href="progress.json"]').count()).toBe(0);
    const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(size.scroll,`overflow at ${width}px`).toBeLessThanOrEqual(size.client);
    if(width<1000){
      const small=await page.locator('button:visible,a:visible,input:visible,select:visible').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return{label:(node.textContent||node.getAttribute('aria-label')||'').trim(),height:box.height,width:box.width,inView:box.bottom>0&&box.top<innerHeight&&box.right>0&&box.left<innerWidth};}).filter(item=>item.inView&&item.width>0&&item.height<43.5));
      expect(small,`touch controls below 44px at ${width}`).toEqual([]);
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(new URL('#scan',baseURL).href,{waitUntil:'networkidle'});
  await page.locator('details.advanced-filters summary').click();
  await page.locator('#scanMinScore').selectOption('-100');
  await page.getByRole('button',{name:'상승 후보 찾기'}).click();
  await expect(page.locator('#resultList .result-card').first()).toBeVisible();
  await page.locator('#resultList .result-card').first().click();
  await expect(page.locator('#reportPanel')).toContainText('찬성 근거');
  await expect(page.locator('#reportPanel')).toContainText('이 방법, 쉽게 이해하기');
  await expect(page.locator('#reportPanel')).toContainText('30초 설명');
  await expect(page.locator('#reportPanel .master-card')).toHaveCount(2);
  await expect(page.locator('#reportPanel .case-card')).toContainText('대표 수익·연구 사례');
  await expect(page.locator('#reportPanel .evidence-link')).toHaveCount(3);
  await expect(page.locator('#reportPanel')).toContainText('선택 방법 비교·민감도');
  await expect(page.locator('#reportPanel')).toContainText('실제 과거 성적은 제공하지 않습니다.');
  await expect(page.locator('#reportPanel')).not.toContainText('NOT_RUN');
  await expect(page.locator('#printReport')).toBeVisible();
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(axe.violations.filter(item=>['critical','serious'].includes(item.impact)),`a11y ${testInfo.project.name}`).toEqual([]);
  expect(errors).toEqual([]);
});

test('Stock Scanner QR policy and PWA assets are public',async({page,request,baseURL})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('#more',baseURL).href,{waitUntil:'networkidle'});
  await expect(page.locator('#publicQrImage')).toBeVisible();
  await expect(page.locator('#publicQrLink')).toHaveAttribute('href',/stock-scanner-qr\.png$/);
  await expect(page.locator('body')).not.toContainText('개발 진척');
  await expect(page.locator('body')).not.toContainText('99/100');
  for(const asset of ['stock-scanner.webmanifest','stock-scanner-sw.js','sw_update_v8.js','methodology_education_v1.json','brand.json','stock-scanner-qr.png','advanced_research_runtime.js','advanced_research_ui.js','advanced_research_v2.json','stage2-readiness.json','advanced-persona-report.json','commercial_free_runtime.js','commercial_free_ui.js','commercial_free_v1.json','commercial-free-readiness.json','commercial-persona-report.json','release-assurance.json','.well-known/security.txt','dashboard.html','progress.json','stage1-market-v8.json','stage2-global-v8.json','free-launch-readiness.json','legal/terms.html','legal/privacy.html']){
    expect((await request.get(new URL(asset,baseURL).href)).ok(),asset).toBeTruthy();
  }
  expect((await request.get(new URL('stock-scanner-v8.css',baseURL).href)).ok(),'stock-scanner-v8.css').toBeTruthy();
  const manifest=await(await request.get(new URL('stock-scanner.webmanifest',baseURL).href)).json();
  expect(manifest.name).toBe('Stock Scanner');
  expect(manifest.start_url).toBe('./stock-scanner.html#today');
  const security=await(await request.get(new URL('.well-known/security.txt',baseURL).href)).text();
  expect(security).toContain('security/advisories/new');
});

test('Stage two advanced workbench is complete responsive and evidence bounded',async({page,baseURL})=>{
  const errors=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('pageerror',error=>errors.push(error.message));
  for(const width of [1440,390,360]){
    await page.setViewportSize({width,height:width>1000?1000:844});
    await page.goto(new URL('stock-scanner.html?research=conflict#reports',baseURL).href,{waitUntil:'networkidle'});
    await expect(page.locator('#advancedWorkbench')).toBeVisible();
    await expect(page.locator('#advancedChange article')).toHaveCount(4);
    await expect(page.locator('#advancedRegimes article')).toHaveCount(4);
    await expect(page.locator('#advancedScenarios article')).toHaveCount(3);
    await expect(page.locator('#advancedEvidence details')).toHaveCount(3);
    await expect(page.locator('#advancedCommodity article')).toHaveCount(2);
    await expect(page.locator('#advancedConflictVerdict')).toContainText(/HOLD|SYNTHETIC/);
    await expect(page.locator('#advancedChartSummary')).toContainText('methods');
    await expect(page.locator('#advancedChartTable table')).toBeVisible();
    const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,active:document.activeElement&&document.activeElement.id}));
    expect(size.scroll,`stage2 overflow at ${width}px`).toBeLessThanOrEqual(size.client);
    expect(size.active).toBe('advancedConflictSection');
  }
  expect(errors).toEqual([]);
});

test('Advanced free commercial desk completes a reproducible local research flow',async({page,baseURL})=>{
  const errors=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('pageerror',error=>errors.push(error.message));
  for(const width of [1440,390,360]){
    await page.setViewportSize({width,height:width>1000?1000:844});
    await page.goto(new URL('stock-scanner.html?research=desk#reports',baseURL).href,{waitUntil:'networkidle'});
    await expect(page.locator('#commercialLaunchDesk')).toBeVisible();
    await expect(page.locator('#commercialTrustFacts article')).toHaveCount(4);
    await expect(page.locator('#commercialChecklist li')).toHaveCount(8);
    await expect(page.locator('#commercialReviewStatus')).not.toHaveText('확인 중');
    const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,active:document.activeElement&&document.activeElement.id}));
    expect(size.scroll,`commercial desk overflow at ${width}px`).toBeLessThanOrEqual(size.client);
    expect(size.active).toBe('commercialLaunchDesk');
  }
  await page.locator('#commercialHypothesis').fill('품질과 가격 흐름이 함께 유지되면 합성 후보가 상대적으로 견조할 것이다.');
  await page.locator('#commercialDisconfirm').fill('품질 점수와 추세 계열이 동시에 음수로 바뀌면 판단을 다시 검토한다.');
  await page.locator('#commercialNextCheck').fill('2026-09-15');
  await page.locator('#commercialJournalForm button[type="submit"]').click();
  await page.locator('#commercialBoundaryConfirm').check();
  await page.locator('#commercialBuildPack').click();
  await expect(page.locator('#commercialPackStatus')).toContainText('FNV1A-');
  await expect(page.locator('#commercialDownloadPack')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('Print report and offline policy surfaces remain usable',async({page,context,browserName,baseURL})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto(new URL('stock-scanner.html#scan',baseURL).href,{waitUntil:'networkidle'});
  await page.locator('details.advanced-filters summary').click();
  await page.locator('#scanMinScore').selectOption('-100');
  await page.getByRole('button',{name:'상승 후보 찾기'}).click();
  await page.locator('#resultList .result-card').first().click();
  await page.emulateMedia({media:'print'});
  await expect(page.locator('#reportPanel')).toBeVisible();
  await expect(page.locator('.scanner-header')).toBeHidden();
  await expect(page.locator('#reportPanel')).toContainText('찬성 근거');
  await page.emulateMedia({media:'screen'});
  test.skip(browserName!=='chromium','one real service-worker offline journey is sufficient');
  await page.goto(new URL('stock-scanner.html?research=desk#reports',baseURL).href,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)location.reload();});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  try{
    await page.goto(new URL('legal/privacy.html',baseURL).href,{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('heading',{name:'Stock Scanner 개인정보 안내'})).toBeVisible();
    await page.goto(new URL('support.html',baseURL).href,{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('heading',{name:'Stock Scanner 지원·신고'})).toBeVisible();
    await page.goto(new URL('stock-scanner.html?research=desk#reports',baseURL).href,{waitUntil:'domcontentloaded'});
    await expect(page.locator('#commercialLaunchDesk')).toBeVisible();
  }finally{await context.setOffline(false);}
});

test('Stock Scanner development dashboard exposes truthful progress and twenty-item queues',async({page,request,baseURL})=>{
  const response=await page.goto(new URL('dashboard.html',baseURL).href,{waitUntil:'networkidle'});
  expect(response?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/개발 진척 대시보드 · Stock Scanner/);
  const progressResponse=await request.get(new URL('progress.json',baseURL).href);
  expect(progressResponse.ok()).toBeTruthy();
  const progress=await progressResponse.json();
  expect(progress.metrics.length).toBeGreaterThanOrEqual(16);
  await expect(page.locator('#metrics .metric-card')).toHaveCount(progress.metrics.length);
  await expect(page.locator('#urgent li')).toHaveCount(20);
  await expect(page.locator('#autonomous li')).toHaveCount(20);
  const summaryData=await(await page.request.get(new URL('progress.json',baseURL).href)).json();
  await expect(page.locator('#summary')).toHaveText(summaryData.summary);
  await expect(page.locator('#metrics')).toContainText('99/100');
  await expect(page.locator('#metrics')).toContainText('24개 / 24개');
  await expect(page.locator('#metrics')).toContainText('0개 / 10개');
  await expect(page.locator('#metrics')).toContainText('20개 / 20개');
  await expect(page.locator('#metrics')).toContainText('0개 / 12개');
  const marketStage1=await(await page.request.get(new URL('stage1-market-v8.json',baseURL).href)).json();
  expect(marketStage1.automatedGates).toHaveLength(24);
  expect(marketStage1.externalGates).toHaveLength(10);
  expect(marketStage1.externalGates.every(item=>item.status!=='VERIFIED')).toBeTruthy();
  const globalStage2=await(await page.request.get(new URL('stage2-global-v8.json',baseURL).href)).json();
  expect(globalStage2.automatedGates).toHaveLength(20);
  expect(globalStage2.externalGates).toHaveLength(12);
  expect(globalStage2.externalGates.every(item=>item.status!=='VERIFIED')).toBeTruthy();
});

test('Stage three advertising marketplace is responsive and fails closed',async({page,request,baseURL})=>{
  const thirdParty=[];
  page.on('request',entry=>{if(/googlesyndication|doubleclick|fundingchoices/i.test(entry.url()))thirdParty.push(entry.url());});
  for(const width of [1440,390,360]){
    await page.setViewportSize({width,height:width>1000?900:844});
    await page.goto(new URL('learn.html',baseURL).href,{waitUntil:'networkidle'});
    await expect(page).toHaveTitle(/Stock Research Methods Guide/);
    await expect(page.locator('.method-guide>article')).toHaveCount(12);
    await expect(page.locator('[data-ad-surface="education"]')).toHaveCount(2);
    await expect(page.locator('[data-ad-state="house"]')).toHaveCount(2);
    await expect(page.locator('body')).toContainText('Advertising is not active');
    const size=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(size.scroll,`learning overflow at ${width}px`).toBeLessThanOrEqual(size.client);
  }
  expect(thirdParty).toEqual([]);
  const readiness=await(await request.get(new URL('advertising-stage1-readiness.json',baseURL).href)).json();
  expect(readiness.automaticGates).toHaveLength(20);
  expect(readiness.externalGates.every(item=>item.status!=='PASS')).toBeTruthy();
  const stage2=await(await request.get(new URL('advertising-stage2-readiness.json',baseURL).href)).json();
  expect(stage2.automaticGates).toHaveLength(20);
  expect(stage2.externalGates).toHaveLength(10);
  expect(stage2.externalGates.every(item=>item.status!=='PASS')).toBeTruthy();
  const stage2Config=await(await request.get(new URL('ad_demand_config.js',baseURL).href)).text();
  expect(stage2Config).toContain("releaseMode: 'PRE_APPROVAL_STAGE2'");
  expect(stage2Config).toContain('enabled: false');
  const stage3=await(await request.get(new URL('advertising-stage3-readiness.json',baseURL).href)).json();
  expect(stage3.automaticGates).toHaveLength(20);
  expect(stage3.externalGates).toHaveLength(12);
  expect(stage3.externalGates.every(item=>item.status!=='PASS')).toBeTruthy();
  const stage3Config=await(await request.get(new URL('ad_marketplace_config.js',baseURL).href)).text();
  expect(stage3Config).toContain("releaseMode: 'PRE_APPROVAL_STAGE3'");
  expect(stage3Config).toContain('emergencyDisabled: true');
  await page.goto(new URL('advertiser-disclosure.html',baseURL).href,{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:'Advertising cannot purchase a research outcome.'})).toBeVisible();
  await expect(page.locator('body')).toContainText('not currently accepting a live campaign');
  await page.goto(new URL('privacy-choices.html',baseURL).href,{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:'Advertising and privacy choices'})).toBeVisible();
  await page.getByRole('button',{name:'Clear advertising preferences'}).click();
  await expect(page.locator('#clearAdStatus')).toContainText('were cleared');
  await expect(page.locator('#gpcStatus')).not.toBeEmpty();
});
test('v8.1 content library has complete reports and English help at desktop and mobile widths',async({page,baseURL})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(new URL('stock-scanner.html#today',baseURL).href,{waitUntil:'networkidle'});
  await expect(page.locator('#contentV81Gallery > article')).toHaveCount(0);
  for(const width of [1440,390,360]){
    // A same-URL navigation may preserve open <details>; start each viewport with a new document.
    await page.goto('about:blank');
    await page.setViewportSize({width,height:900});
    await page.goto(new URL('stock-scanner.html#more',baseURL).href,{waitUntil:'networkidle'});
    await expect(page.locator('#contentV81Methods > details')).toHaveCount(12);
    await expect(page.locator('#contentV81Tutorials > article')).toHaveCount(18);
    await expect(page.locator('#contentV81Gallery > article details')).toHaveCount(36);
    await expect(page.locator('#contentV81States > article')).toHaveCount(12);
    await page.locator('#contentV81Gallery > article details summary').first().click();
    await expect(page.locator('#contentV81Gallery > article details code').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBeTruthy();
    if(width<900){
      const heights=await page.locator('.mobile-routes button').evaluateAll(nodes=>nodes.map(x=>x.getBoundingClientRect().height));
      expect(heights.every(x=>x>=44)).toBeTruthy();
    }
  }
  await page.locator('#scannerLocale').selectOption('en');
  await expect(page.locator('#contentV81Title')).toHaveText('Methods, cases and practice library');
  await expect(page.locator('#faqList summary').first()).toHaveText('What does this service do?');
  await expect(page.locator('#glossaryList dt').first()).toHaveText('Synthetic data');
  await expect(page.locator('#contentV81Gallery')).toContainText('Held: missing input');
  await expect(page.locator('#contentV81Methods')).toContainText('Washington Post: the price-value gap');
  expect(errors).toEqual([]);
});
