import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { vantSvgIcons } from './tools/vant-svg-icons.mjs'

const base = process.env.PUBLIC_BASE || '/'
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('PUBLIC_BASE must start and end with /')

function offlineAssets() {
  return {
    name: 'personal-offline-assets', enforce: 'post',
    generateBundle(_, bundle) {
      const files = ['index.html', ...Object.keys(bundle).filter(name => name !== 'index.html'),
        'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest']
      const hash = createHash('sha256')
      for (const asset of Object.values(bundle)) hash.update(asset.type === 'chunk' ? asset.code : asset.source)
      for (const name of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) hash.update(readFileSync(new URL('./public/' + name, import.meta.url)))
      const version = hash.digest('hex').slice(0, 16)
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify({
        name: '工时和收入统计 · 个人版', short_name: '工时统计', description: '个人工时和收入记录',
        id: base, start_url: base, scope: base, display: 'standalone', lang: 'zh-CN',
        background_color: '#f5f5f5', theme_color: '#2563eb',
        icons: [{ src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' }],
      }) })
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'massage-personal-${version}';
const BASE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify([...new Set(files)].map(name => base + name))};
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
` })
    },
  }
}
export default defineConfig({ base, plugins: [vantSvgIcons(), vue(), offlineAssets()], server: { port: 5174 }, build: { sourcemap: false } })
