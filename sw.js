
const CACHE = 'massage-personal-ff491a7a0b2cb395';
const BASE = "/massage-personal/";
const FILES = ["/massage-personal/index.html","/massage-personal/assets/index-RrbGSBom.css","/massage-personal/assets/Dashboard-hAhABgn6.css","/massage-personal/assets/Statistics-B_v_LHQz.css","/massage-personal/assets/DailyServiceList-Dc6CmAvm.css","/massage-personal/assets/RecordDetail-C9OUea3x.css","/massage-personal/assets/More-B6euJXjW.css","/massage-personal/assets/PageHeader-BY5I4r7b.css","/massage-personal/assets/Rules-BM6GbbV9.css","/massage-personal/assets/Projects-DOm22Jda.css","/massage-personal/assets/PersonalMigration-ImdwAh5O.css","/massage-personal/assets/Settings-Bp1N3fhA.css","/massage-personal/assets/SettingsPageShell-DV1n8I1r.css","/massage-personal/assets/PageNavBar-DsPolgCO.css","/massage-personal/assets/PageState-DDiZPnF_.css","/massage-personal/assets/MenuCard-CURbwYsi.css","/massage-personal/assets/index-ATRz1e8h.js","/massage-personal/assets/Dashboard-B113LwvH.js","/massage-personal/assets/Statistics-BDUyRsbe.js","/massage-personal/assets/DailyServiceList-pifuBVJ_.js","/massage-personal/assets/RecordDetail-BAJV_aP7.js","/massage-personal/assets/records-DREjt6Ln.js","/massage-personal/assets/More-B7J4B1BG.js","/massage-personal/assets/PageHeader-BytLVK6a.js","/massage-personal/assets/Rules-YgGUitFW.js","/massage-personal/assets/Projects-kDXp5w-Q.js","/massage-personal/assets/useFeedback-DfA4E7KW.js","/massage-personal/assets/PersonalMigration-CNZUIwG8.js","/massage-personal/assets/format-D4amIXh1.js","/massage-personal/assets/Settings-Dw9JCxzD.js","/massage-personal/assets/rules-BnZetcgD.js","/massage-personal/assets/date-BGVd1dTd.js","/massage-personal/assets/SettingsPageShell-BpfoWTUC.js","/massage-personal/assets/PageNavBar-C2aSn6ib.js","/massage-personal/assets/PageState-DdNA1lN8.js","/massage-personal/assets/MenuCard-C1uU2EDG.js","/massage-personal/icon-192.png","/massage-personal/icon-512.png","/massage-personal/apple-touch-icon.png","/massage-personal/manifest.webmanifest"];
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
