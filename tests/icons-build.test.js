import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { ActionSheet, Button, Cell, Checkbox, Icon, NavBar, Popup, Tabbar, TabbarItem, Tag, Toast } from 'vant'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { baseParse, NodeTypes } from '@vue/compiler-dom'
import { parse as parseJs, parseExpression } from '@babel/parser'
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
    'checked', 'circle', 'arrow-left', 'arrow', 'cross', 'success', 'fail', 'clear', 'minus']
  // Real Vant rendering covers icons produced inside controls, without a browser.
  const app = createSSRApp({ render: () => h('div', [
    ...names.map(name => h(Icon, { name })),
    h(Tabbar, {}, () => ['home-o', 'chart-trending-o', 'setting-o'].map(icon => h(TabbarItem, { icon }))),
    h(Cell, { isLink: true, title: '合成测试' }),
    h(NavBar, { leftArrow: true }),
    h(Button, { icon: 'delete-o' }, () => '删除'),
    h(Checkbox, { modelValue: true }),
    h(Checkbox, { indeterminate: true }),
    h(Popup, { show: true, closeable: true }),
    h(ActionSheet, { show: true, title: '合成测试' }),
    h(Tag, { closeable: true }, () => '合成测试'),
    h(Toast, { show: true, type: 'success' }),
    h(Toast, { show: true, type: 'fail' }),
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

test('all page icon references and dynamic branches have SVG mappings', async () => {
  async function vueFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    return (await Promise.all(entries.map(entry => entry.isDirectory()
      ? vueFiles(resolve(directory, entry.name))
      : entry.name.endsWith('.vue') ? [resolve(directory, entry.name)] : []))).flat()
  }
  let references = 0
  for (const file of await vueFiles(resolve('src'))) {
    const { descriptor } = parseSfc(await readFile(file, 'utf8'))
    if (!descriptor.template) continue
    const bindings = new Map()
    for (const script of [descriptor.script, descriptor.scriptSetup].filter(Boolean)) {
      for (const statement of parseJs(script.content, { sourceType: 'module' }).program.body) {
        if (statement.type === 'VariableDeclaration') for (const item of statement.declarations) {
          if (item.id.type === 'Identifier') bindings.set(item.id.name, item.init)
        }
      }
    }
    function values(expression) {
      if (expression.type === 'StringLiteral') return [expression.value]
      if (expression.type === 'ConditionalExpression') return [...values(expression.consequent), ...values(expression.alternate)]
      if (expression.type === 'ArrowFunctionExpression') return values(expression.body)
      if (expression.type === 'CallExpression' && expression.callee.name === 'computed') return values(expression.arguments[0])
      if (expression.type === 'Identifier' && bindings.has(expression.name)) return values(bindings.get(expression.name))
      // MenuIcon forwards its name prop; all callers are checked independently.
      if (file.endsWith('/MenuIcon.vue') && expression.type === 'Identifier' && expression.name === 'name') return []
      assert.fail(`Cannot audit dynamic icon in ${file}; add explicit branch coverage`)
    }
    function visit(node) {
      if (node.type === NodeTypes.ELEMENT) for (const prop of node.props) {
        const key = prop.type === NodeTypes.ATTRIBUTE ? prop.name
          : prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' ? prop.arg?.content : null
        const isIcon = key === 'name' && ['van-icon', 'MenuIcon'].includes(node.tag)
          || node.tag.startsWith('van-') && ['icon', 'left-icon', 'right-icon', 'close-icon', 'clear-icon'].includes(key)
        if (!isIcon) continue
        const names = prop.type === NodeTypes.ATTRIBUTE ? [prop.value?.content] : values(parseExpression(prop.exp.content))
        for (const name of names) {
          references++
          assert.ok(masks.has(name), `Missing SVG for ${name} in ${file}`)
        }
      }
      for (const child of node.children || []) visit(child)
    }
    visit(baseParse(descriptor.template.content))
  }
  assert.ok(references > 0)
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
