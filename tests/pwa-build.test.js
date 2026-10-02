import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import vm from 'node:vm'

const output = resolve('dist')
const manifest = JSON.parse(await readFile(resolve(output, 'manifest.webmanifest'), 'utf8'))
const worker = await readFile(resolve(output, 'sw.js'), 'utf8')
const origin = 'https://example.test'
const base = manifest.scope

function runtime(failInstall = false) {
  const handlers = {}, cachesByName = new Map(), fetched = [], operations = []
  const caches = {
    async open(name) {
      if (!cachesByName.has(name)) cachesByName.set(name, new Map())
      const values = cachesByName.get(name)
      return {
        async addAll(files) {
          operations.push(['precache', files])
          if (failInstall) throw new Error('network unavailable')
          for (const file of files) values.set(file, { url: file, cached: true })
        },
        async match(url) { return values.get(url) },
      }
    },
    async keys() { return [...cachesByName.keys()] },
    async delete(name) { operations.push(['delete', name]); return cachesByName.delete(name) },
  }
  const self = { location: { origin }, clients: { async claim() { operations.push(['claim']) } },
    addEventListener(name, fn) { handlers[name] = fn },
    skipWaiting() { operations.push(['skipWaiting']) },
  }
  vm.runInNewContext(worker, { self, caches, URL, fetch: async request => {
    fetched.push(request); throw new Error('offline')
  } })
  async function lifecycle(name) {
    let pending
    handlers[name]({ waitUntil(value) { pending = value } })
    await pending
  }
  async function request(path, mode = 'cors') {
    let response
    handlers.fetch({ request: { url: origin + path, method: 'GET', mode }, respondWith(value) { response = value } })
    return response ? await response : null
  }
  return { handlers, cachesByName, operations, fetched, lifecycle, request }
}

test('manifest, icons and HTML links share permanent host subpath', async () => {
  const html = await readFile(resolve(output, 'index.html'), 'utf8')
  assert.equal(manifest.start_url, base); assert.equal(manifest.id, base)
  assert.equal(manifest.display, 'standalone')
  assert.ok(html.includes(`href="${base}manifest.webmanifest"`))
  assert.ok(html.includes(`href="${base}apple-touch-icon.png"`))
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith(base))
    assert.ok((await readFile(resolve(output, icon.src.slice(base.length)))).length > 0)
  }
})
test('installation precaches all lazy route chunks and assets', async () => {
  const app = runtime(); await app.lifecycle('install')
  const files = app.operations.find(op => op[0] === 'precache')[1]
  for (const name of await readdir(resolve(output, 'assets'))) assert.ok(files.includes(base + 'assets/' + name), name)
  assert.ok(files.includes(base + 'index.html')); assert.ok(files.includes(base + 'manifest.webmanifest'))
})
test('offline navigation and lazy page loading require no network', async () => {
  const app = runtime(); await app.lifecycle('install'); await app.lifecycle('activate')
  assert.equal((await app.request(base + '?home=1', 'navigate')).url, base + 'index.html')
  const names = await readdir(resolve(output, 'assets'))
  const statistics = names.find(name => name.startsWith('Statistics-') && name.endsWith('.js'))
  assert.equal((await app.request(base + 'assets/' + statistics)).cached, true)
  assert.equal(app.fetched.length, 0)
})
test('cache isolation leaves other websites and private data paths alone', async () => {
  const app = runtime(); app.cachesByName.set('another-app', new Map())
  app.cachesByName.set('massage-personal-old', new Map())
  await app.lifecycle('install'); await app.lifecycle('activate')
  assert.ok(app.cachesByName.has('another-app')); assert.ok(!app.cachesByName.has('massage-personal-old'))
  assert.equal(await app.request(base + 'private-records.json'), null)
  assert.equal(await app.request('/api/services'), null)
})
test('failed install discards partial new cache while preserving previous version', async () => {
  const app = runtime(true); app.cachesByName.set('massage-personal-old', new Map())
  await assert.rejects(app.lifecycle('install'))
  assert.deepEqual([...app.cachesByName.keys()], ['massage-personal-old'])
})
test('updates activate only after explicit user request', async () => {
  const app = runtime(); await app.lifecycle('install')
  assert.ok(!app.operations.some(op => op[0] === 'skipWaiting'))
  app.handlers.message({ data: { type: 'ACTIVATE_UPDATE' } })
  assert.ok(app.operations.some(op => op[0] === 'skipWaiting'))
})
