import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, optimizeDeps, resolveConfig } from 'vite'

test('development dependency prebundling also serves local SVG styles without fonts', async () => {
  // Complete the optimizer before transforming its output. No browser or socket.
  const config = await resolveConfig({ logLevel: 'silent' }, 'serve')
  await optimizeDeps(config, true)
  const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' })
  try {
    const main = await server.transformRequest('/src/main.js')
    const urls = [...main.code.matchAll(/import\s*["']([^"']*vant_es_[^"']*style[^"']*)["']/g)].map(match => match[1])
    assert.ok(urls.length > 0, 'Expected actual Vant prebundled style modules')
    let replaced = 0
    for (const url of urls) {
      const result = await server.transformRequest(url)
      assert.doesNotMatch(result.code, /\/vant\/es\/icon\/index\.css/)
      if (result.code.includes('/src/styles/icons.css')) replaced++
    }
    assert.ok(replaced > 0, 'Prebundled Vant components must import local SVG styles')
    const result = await server.transformRequest('/src/styles/icons.css')
    assert.doesNotMatch(result.code, /vant-icon|at\.alicdn\.com|data:font\//)
    assert.match(result.code, /personal-icon/)
    assert.match(result.code, /data:image\/svg\+xml/)
    for (const name of ['home-o', 'chart-trending-o', 'setting-o', 'cross', 'minus']) {
      assert.ok(result.code.includes(`van-icon-${name}`), name)
    }
  } finally {
    await server.close()
  }
})
