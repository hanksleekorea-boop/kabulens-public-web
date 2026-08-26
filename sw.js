const CACHE='kabulens-shell-v30-2-public-beta2';
const SHELL=['./','./index.html','./styles.css','./storage.js','./pc_runtime.js','./mobile_runtime.js','./research_runtime.js','./catalog_10000.json','./app.js','./evidence_runtime.js','./billing_runtime.js','./license_runtime.js','./manifest.webmanifest','./icon.svg','./legal/terms.html','./legal/privacy.html','./status.html','./support.html','./robots.txt','./sitemap.xml'];
const APP_SHELL=new URL('./index.html',self.registration.scope).href;
const APP_SCOPE_PATH=new URL(self.registration.scope).pathname;
function isAppShellNavigation(url){return url.pathname===APP_SCOPE_PATH||url.pathname===APP_SCOPE_PATH+'index.html';}

async function prepareShell(){const cache=await caches.open(CACHE);await cache.addAll(SHELL);const missing=[];for(const asset of SHELL){if(!await cache.match(asset,{ignoreSearch:true}))missing.push(asset);}if(missing.length)throw new Error('OFFLINE_SHELL_INCOMPLETE:'+missing.join(','));}
self.addEventListener('install',event=>event.waitUntil(prepareShell()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('kabulens-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(url.pathname.endsWith('/__connectivity__'))return;if(request.method!=='GET')return;if(request.mode==='navigate'){if(isAppShellNavigation(url)){event.respondWith(caches.match(APP_SHELL).then(hit=>hit||fetch(request)));}else{event.respondWith(fetch(request).catch(()=>caches.match(request,{ignoreSearch:true}).then(hit=>hit||Promise.reject(new Error('OFFLINE_DOCUMENT_MISS')))));}return;}event.respondWith(fetch(request).then(response=>{if(response.ok&&url.origin===location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(()=>caches.match(request,{ignoreSearch:true}).then(hit=>hit||Promise.reject(new Error('OFFLINE_ASSET_MISS')))));});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='APPLY_UPDATE')self.skipWaiting();});
