
const CACHE = 'massage-personal-920867c466772c86';
const BASE = "/massage-personal/";
const FILES = ["/massage-personal/index.html","/massage-personal/assets/index-RrbGSBom.css","/massage-personal/assets/Dashboard-hAhABgn6.css","/massage-personal/assets/Statistics-B_v_LHQz.css","/massage-personal/assets/DailyServiceList-Dc6CmAvm.css","/massage-personal/assets/RecordDetail-C9OUea3x.css","/massage-personal/assets/More-B6euJXjW.css","/massage-personal/assets/PageHeader-BY5I4r7b.css","/massage-personal/assets/Rules-BM6GbbV9.css","/massage-personal/assets/Projects-DOm22Jda.css","/massage-personal/assets/PersonalMigration-ImdwAh5O.css","/massage-personal/assets/Settings-Bp1N3fhA.css","/massage-personal/assets/SettingsPageShell-DV1n8I1r.css","/massage-personal/assets/PageNavBar-DsPolgCO.css","/massage-personal/assets/PageState-DDiZPnF_.css","/massage-personal/assets/MenuCard-CURbwYsi.css","/massage-personal/assets/index-BlIISuTy.js","/massage-personal/assets/Dashboard-B_ZyfWlp.js","/massage-personal/assets/Statistics-D1O5zlWK.js","/massage-personal/assets/DailyServiceList-DpeM8rsE.js","/massage-personal/assets/RecordDetail-Dv2PwFi-.js","/massage-personal/assets/records-Coe-nYkW.js","/massage-personal/assets/More-9uTEZK7d.js","/massage-personal/assets/PageHeader-D302XyzN.js","/massage-personal/assets/Rules-BzXsJIci.js","/massage-personal/assets/Projects-DGpbTboC.js","/massage-personal/assets/useFeedback-DHGBbBYr.js","/massage-personal/assets/PersonalMigration-CdLrelrK.js","/massage-personal/assets/format-D4amIXh1.js","/massage-personal/assets/Settings-B7IgiZUg.js","/massage-personal/assets/rules-Ci7RqGo-.js","/massage-personal/assets/date-QOsOu41Q.js","/massage-personal/assets/SettingsPageShell-CRksIW0S.js","/massage-personal/assets/PageNavBar-BVlatiJw.js","/massage-personal/assets/PageState-Dg7a_W_g.js","/massage-personal/assets/MenuCard-BDyXvZZ8.js","/massage-personal/icon-192.png","/massage-personal/icon-512.png","/massage-personal/apple-touch-icon.png","/massage-personal/manifest.webmanifest"];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try { await cache.addAll(FILES); } catch (error) { await caches.delete(CACHE); throw error; }
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('massage-personal-') && key !== CACHE).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(BASE + 'index.html')).then(response => response || fetch(event.request)));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(response => response || fetch(event.request)));
  }
});
