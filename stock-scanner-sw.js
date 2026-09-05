'use strict';
const CACHE='stock-scanner-shell-v9-reliability-2';
const SHELL=['./','./index.html','./root_redirect.js','./stock-scanner.html','./stock-scanner.css','./stock_scanner_runtime.js','./reliability_runtime.js','./practice_runtime.js','./markets.html','./markets.css','./market_directory_ui.js','./sw_update_v8.js','./advanced_research_runtime.js','./advanced_research_ui.js','./advanced_research_v2.json','./commercial_free_runtime.js','./commercial_free_ui.js','./commercial_free_v1.json','./methodology_education_v1.json','./free_content_guide_v1.json','./content_stage1_v81.json','./public_config.js','./brand.json','./stock-scanner.webmanifest','./icon.svg','./learn.html','./ad_config.js','./ad_runtime.js','./ad_demand_config.js','./ad_orchestrator.js','./ad-operations-policy-v2.json','./advertising-stage2-readiness.json','./ad_marketplace_config.js','./ad_marketplace_orchestrator.js','./ad-operations-policy-v3.json','./direct-sales-policy-v1.json','./advertising-stage3-readiness.json','./advertiser-disclosure.html','./privacy-choices.html','./privacy_choices.js','./legal/terms.html','./legal/privacy.html','./legal/terms-en.html','./legal/privacy-en.html','./status.html','./support.html','./stock-scanner-qr.png'];
SHELL.push('./service_status.js');
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('stock-scanner-')||key.startsWith('kabulens-shell-'))&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  const scope=new URL('./',self.location.href),relative='./'+url.pathname.slice(scope.pathname.length);
  if(!url.pathname.startsWith(scope.pathname))return;
  const shell=SHELL.includes(relative);
  if(request.mode==='navigate'){
    const fallback=shell?relative:'./stock-scanner.html';
    event.respondWith(fetch(request).then(response=>{
      if(!response.ok)throw new Error('HTTP_'+response.status);
      if(shell)event.waitUntil(caches.open(CACHE).then(cache=>cache.put(relative,response.clone())));
      return response;
    }).catch(()=>caches.open(CACHE).then(cache=>cache.match(fallback)).then(found=>found||new Response('Offline page unavailable',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}}))));
  }else if(shell){
    event.respondWith(fetch(request).then(response=>{
      if(!response.ok)throw new Error('HTTP_'+response.status);
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(relative,response.clone())));
      return response;
    }).catch(()=>caches.open(CACHE).then(cache=>cache.match(relative)).then(found=>found||new Response('',{status:503}))));
  }
});
