const CACHE='kabulens-shell-v21';
const SHELL=['./','./index.html','./styles.css','./storage.js','./pc_runtime.js','./mobile_runtime.js','./research_runtime.js','./app.js','./evidence_runtime.js','./manifest.webmanifest','./icon.svg'];
const APP_SHELL=new URL('./index.html',self.registration.scope).href;

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('kabulens-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const request=event.request;const url=new URL(request.url);if(url.pathname.endsWith('/__connectivity__'))return;if(request.method!=='GET')return;if(request.mode==='navigate'){event.respondWith(caches.match(APP_SHELL).then(hit=>hit||fetch(request)));return;}event.respondWith(fetch(request).then(response=>{if(response.ok&&url.origin===location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(()=>caches.match(request,{ignoreSearch:true}).then(hit=>hit||Promise.reject(new Error('OFFLINE_ASSET_MISS')))));});
self.addEventListener('message',event=>{if(event.data&&event.data.type==='APPLY_UPDATE')self.skipWaiting();});
