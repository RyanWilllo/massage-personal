import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { Button, Cell, Checkbox, Icon, NavBar, Popup, Tabbar, TabbarItem } from 'vant'
import postcss from 'postcss'

const assets = resolve('dist/assets')
const sheets = await Promise.all((await readdir(assets)).filter(name => name.endsWith('.css'))
  .map(async name => postcss.parse(await readFile(resolve(assets, name), 'utf8'))))
const masks = new Map()
for (const sheet of sheets) sheet.walkRules(rule => {
  const name = rule.selector.match(/^\.van-icon-([\w-]+)$/)?.[1]
  if (name) rule.walkDecls('--personal-icon', declaration => masks.set(name, declaration.value))
})

test('page and Vant internal icons resolve to distinct local SVGs', async () => {
  const names = ['home-o', 'chart-trending-o', 'setting-o', 'balance-list-o', 'apps-o',
    'delete-o', 'notes-o', 'edit', 'plus', 'warning-o', 'search', 'arrow-down', 'arrow-up',
    'checked', 'circle', 'arrow-left', 'arrow', 'cross', 'success', 'fail', 'clear']
  // Real Vant rendering covers icons produced inside controls, without a browser.
  const app = createSSRApp({ render: () => h('div', [
    ...names.map(name => h(Icon, { name })),
    h(Tabbar, {}, () => ['home-o', 'chart-trending-o', 'setting-o'].map(icon => h(TabbarItem, { icon }))),
    h(Cell, { isLink: true, title: '合成测试' }),
    h(NavBar, { leftArrow: true }),
    h(Button, { icon: 'delete-o' }, () => '删除'),
    h(Checkbox, { modelValue: true }),
    h(Popup, { show: true, closeable: true }),
  ]) })
  const html = await renderToString(app)
  const rendered = new Set([...html.matchAll(/\bvan-icon-([\w-]+)/g)].map(match => match[1]))
  for (const name of rendered) {
    const mask = masks.get(name)
    assert.ok(mask, `Missing SVG mask for ${name}`)
    const url = mask.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
    assert.ok(url, `Invalid SVG mask for ${name}`)
    let svg
    if (url.startsWith('data:image/svg+xml,')) svg = decodeURIComponent(url.split(',').slice(1).join(','))
    else {
      assert.ok(url.startsWith('/massage-personal/assets/'), `Nonlocal SVG: ${url}`)
      svg = await readFile(resolve('dist', url.slice('/massage-personal/'.length)), 'utf8')
    }
    assert.match(svg, /<svg\b/)
    assert.match(svg, /viewBox=["']0 0 24 24["']/)
    assert.match(svg, /<(path|circle|rect)\b/)
    assert.doesNotMatch(svg, /<(script|image|foreignObject)\b|\bhref=/i)
  }
  for (const name of names) assert.ok(rendered.has(name))
  assert.notEqual(masks.get('checked'), masks.get('circle'))
  assert.notEqual(masks.get('home-o'), masks.get('chart-trending-o'))
  assert.notEqual(masks.get('arrow-up'), masks.get('arrow-down'))
})

test('built icons use color-preserving WebKit masks and contain no icon fonts or CDN fallback', () => {
  const declarations = new Map()
  for (const sheet of sheets) {
    assert.doesNotMatch(sheet.toString(), /vant-icon|at\.alicdn\.com|data:font\/|\\e[0-9a-f]{3}/i)
    sheet.walkRules(rule => {
      if (/^\.van-icon::?before$/.test(rule.selector)) {
        rule.walkDecls(declaration => declarations.set(declaration.prop, declaration.value))
      }
    })
  }
  assert.equal(declarations.get('content'), '""')
  assert.equal(declarations.get('background-color'), 'currentColor')
  assert.equal(declarations.get('-webkit-mask'), declarations.get('mask'))
  assert.match(declarations.get('mask'), /var\(--personal-icon\)/)
  assert.equal(declarations.get('width'), '1em')
  assert.equal(declarations.get('height'), '1em')
})
