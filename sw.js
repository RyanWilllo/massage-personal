
const CACHE = 'massage-personal-2afdc2948c6baf2b';
const BASE = "/massage-personal/";
const FILES = ["/massage-personal/index.html","/massage-personal/assets/index-RrbGSBom.css","/massage-personal/assets/Dashboard-hAhABgn6.css","/massage-personal/assets/Statistics-B_v_LHQz.css","/massage-personal/assets/DailyServiceList-Dc6CmAvm.css","/massage-personal/assets/RecordDetail-C9OUea3x.css","/massage-personal/assets/More-B6euJXjW.css","/massage-personal/assets/PageHeader-BY5I4r7b.css","/massage-personal/assets/Rules-BM6GbbV9.css","/massage-personal/assets/Projects-DOm22Jda.css","/massage-personal/assets/PersonalMigration-CftRRwy-.css","/massage-personal/assets/Settings-Bp1N3fhA.css","/massage-personal/assets/SettingsPageShell-DV1n8I1r.css","/massage-personal/assets/PageNavBar-DsPolgCO.css","/massage-personal/assets/PageState-DDiZPnF_.css","/massage-personal/assets/MenuCard-CURbwYsi.css","/massage-personal/assets/index-Bd7dpzuJ.js","/massage-personal/assets/Dashboard-Bv43vSCJ.js","/massage-personal/assets/Statistics-p5izWNqJ.js","/massage-personal/assets/DailyServiceList-DR4xdaCh.js","/massage-personal/assets/RecordDetail-BB7G3q4e.js","/massage-personal/assets/records-BdlmbCuS.js","/massage-personal/assets/More-QVSxkaOX.js","/massage-personal/assets/PageHeader-C2NcznSP.js","/massage-personal/assets/Rules-DY-6OWhI.js","/massage-personal/assets/Projects-D_VlXX6k.js","/massage-personal/assets/useFeedback-Wq9W-b9r.js","/massage-personal/assets/PersonalMigration-BwGh_M_H.js","/massage-personal/assets/format-D4amIXh1.js","/massage-personal/assets/Settings-BKMhNLEZ.js","/massage-personal/assets/rules-1q1KiApT.js","/massage-personal/assets/date-CuYPvFE_.js","/massage-personal/assets/SettingsPageShell-BlDilixA.js","/massage-personal/assets/PageNavBar-B9nd4q0I.js","/massage-personal/assets/PageState-lOcmH4JO.js","/massage-personal/assets/MenuCard-CDdKI0BO.js","/massage-personal/icon-192.png","/massage-personal/icon-512.png","/massage-personal/apple-touch-icon.png","/massage-personal/manifest.webmanifest"];
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
