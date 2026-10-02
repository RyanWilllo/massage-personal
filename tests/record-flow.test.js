import 'fake-indexeddb/auto'
import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compileScript, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as records from '../src/services/records.js'
import * as format from '../src/utils/format.js'
import * as date from '../src/utils/date.js'
import { updateProject } from '../src/services/rules.js'
import { closeDatabase, DATABASE_NAME, readState } from '../src/storage/database.js'
import { useSheetViewport } from '../src/composables/useSheetViewport.js'

// Mount the real SFC setup with Vue's in-memory renderer, without a browser.
// Persistence uses the real service layer and a synthetic IndexedDB database.
const { descriptor } = parse(readFileSync(new URL('../src/components/ServiceRecordFlow.vue', import.meta.url), 'utf8'))
const script = compileScript(descriptor, { id: 'record-flow-test' }).content
  .replace(/^import (\{[^\n]+\}|\w+) from '([^']+)'$/gm, (_, names, source) =>
    `const ${names} = modules[${JSON.stringify(source)}]`)
  .replace('export default', 'return')
const componentFactory = new Function('modules', script)
const renderer = vue.createRenderer({
  createComment: () => ({}), insert() {}, remove() {}, parentNode: () => null,
  nextSibling: () => null, setText() {}, setElementText() {}, patchProp() {},
  createElement: () => ({}), createText: () => ({}),
})
let viewport
beforeEach(async () => {
  await closeDatabase()
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = resolve; request.onerror = reject
  })
  viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0 })
  globalThis.window = Object.assign(new EventTarget(), { innerHeight: 800, visualViewport: viewport })
})

function mountFlow(t, overrides = {}) {
  const messages = [], submitted = []
  const component = componentFactory({
    vue,
    '../services/records': { ...records, ...overrides },
    '../composables/useFeedback': { useFeedback: () => ({
      error: message => messages.push(message), warning: message => messages.push(message),
    }) },
    '../composables/useSheetViewport': { useSheetViewport },
    '../utils/format': format,
    '../utils/date': date,
    './PageState.vue': {},
  })
  let state
  const setup = component.setup
  const app = renderer.createApp({
    ...component,
    setup(props, context) { state = setup(props, context); return state },
    render: () => null,
  }, { onSubmitted: value => submitted.push(value) })
  const exposed = app.mount({})
  t.after(() => app.unmount())
  return { state, exposed, submitted, messages, unmount: () => app.unmount() }
}

test('single sheet edits retain all fields and save multi-project snapshots', async t => {
  const { state, exposed, submitted } = mountFlow(t)
  await exposed.open('2026-07-15')
  state.toggleProject(state.mains.value.find(project => project.project_id === 2))
  state.toggleExtra(7)
  state.isReferred.value = true
  state.remark.value = ' 合成测试备注 '
  state.toggleDuration(1)
  state.chooseDuration(1, 105)
  assert.equal(state.showRecord.value, true)
  assert.equal(state.remark.value, ' 合成测试备注 ')
  assert.deepEqual(state.selectedExtras.value, [7])
  assert.equal(state.selectedDuration(2), 60)
  await state.submit()
  const saved = await records.getService(submitted[0].service_id)
  assert.deepEqual(saved.items.map(item => item.item_type), ['main', 'extra_work', 'extra_income'])
  assert.equal(saved.total_work_hours, 3.75)
  assert.equal(saved.total_income, 160.5)
  assert.equal(saved.remark, '合成测试备注')
  assert.equal(state.showRecord.value, false)
  assert.equal(state.banner.value.hours, saved.total_work_hours)
})

test('switching to home service clears incompatible selections before saving', async t => {
  const { state, exposed, submitted } = mountFlow(t)
  await exposed.open('2026-07-15')
  state.toggleExtra(7)
  state.toggleProject(state.mains.value.find(project => project.project_id === 3))
  state.toggleExtra(8)
  assert.deepEqual(state.selectedProjectIds.value, [3])
  assert.deepEqual(state.selectedExtras.value, [])
  state.chooseDuration(3, 105)
  await state.submit()
  const saved = await records.getService(submitted[0].service_id)
  assert.equal(saved.items.length, 1)
  assert.equal(saved.total_work_hours, 2.625)
  assert.equal(saved.total_income, 105)
})

test('save failure keeps the sheet and draft available for retry', async t => {
  const { state, exposed, submitted, messages } = mountFlow(t)
  await exposed.open('2026-07-15')
  state.chooseDuration(1, 90)
  state.remark.value = '合成测试备注'
  state.isReferred.value = true
  await updateProject(1, { status: 0 })
  await state.submit()
  assert.equal(state.showRecord.value, true)
  assert.equal(state.submitting.value, false)
  assert.equal(state.selectedDuration(1), 90)
  assert.equal(state.remark.value, '合成测试备注')
  assert.equal(submitted.length, 0)
  assert.equal((await readState()).services.length, 0)
  assert.match(messages[0], /保存失败/)
  await updateProject(1, { status: 1 })
  await state.submit()
  assert.equal(submitted.length, 1)
  assert.equal((await readState()).services.length, 1)
})

test('rapid save, cancel and selection edits cannot duplicate or alter pending save', async t => {
  let release, saveCalls = 0
  const gate = new Promise(resolve => { release = resolve })
  const { state, exposed, submitted } = mountFlow(t, {
    quickService: async payload => { saveCalls++; await gate; return records.quickService(payload) },
  })
  await exposed.open('2026-07-15')
  const pending = state.submit()
  await state.submit()
  state.close()
  state.chooseDuration(1, 90)
  state.toggleProject(state.mains.value.find(project => project.project_id === 2))
  await exposed.open('2026-07-16')
  assert.equal(state.showRecord.value, true)
  assert.equal(state.selectedDuration(1), 60)
  assert.equal(state.serviceDate.value, '2026-07-15')
  release()
  await pending
  await state.submit()
  assert.equal(saveCalls, 1)
  assert.equal(submitted.length, 1)
  assert.equal((await readState()).services.length, 1)
})

test('cancel makes no write; next record starts with a fresh draft', async t => {
  const { state, exposed } = mountFlow(t)
  await exposed.open('2026-07-15')
  state.remark.value = '合成测试备注'
  state.chooseDuration(1, 90)
  state.toggleExtra(7)
  state.close()
  await state.submit()
  assert.equal((await readState()).services.length, 0)
  await exposed.open('2026-07-16')
  assert.equal(state.remark.value, '')
  assert.equal(state.selectedDuration(1), 60)
  assert.deepEqual(state.selectedExtras.value, [])
})

test('no available projects blocks saving and can be retried after enabling one', async t => {
  const projects = await records.getAvailableProjects()
  for (const project of projects) await updateProject(project.project_id, { status: 0 })
  const { state, exposed } = mountFlow(t)
  await exposed.open('2026-07-15')
  assert.match(state.projectLoadError.value, /没有可记录/)
  await state.submit()
  assert.equal((await readState()).services.length, 0)
  await updateProject(1, { status: 1 })
  await state.retryLoadProjects()
  assert.equal(state.projectLoadError.value, '')
  assert.equal(state.canSave.value, true)
})

test('visual viewport resize and scroll keep action bar above keyboard and clean up listeners', t => {
  const { state, unmount } = mountFlow(t)
  assert.equal(state.sheetStyle.value['--sheet-height'], '788px')
  viewport.height = 400
  viewport.offsetTop = 40
  viewport.dispatchEvent(new Event('resize'))
  assert.equal(state.sheetStyle.value['--sheet-height'], '388px')
  assert.equal(state.sheetStyle.value.bottom, '360px')
  viewport.offsetTop = 80
  viewport.dispatchEvent(new Event('scroll'))
  assert.equal(state.sheetStyle.value.bottom, '320px')
  viewport.height = 800
  viewport.offsetTop = 0
  viewport.dispatchEvent(new Event('resize'))
  assert.equal(state.sheetStyle.value.bottom, '0px')
  unmount()
  viewport.height = 300
  viewport.dispatchEvent(new Event('resize'))
  assert.equal(state.sheetStyle.value['--sheet-height'], '788px')
})

test('viewport fallback follows window resize when visualViewport is unavailable', t => {
  delete window.visualViewport
  const { state } = mountFlow(t)
  window.innerHeight = 450
  window.dispatchEvent(new Event('resize'))
  assert.equal(state.sheetStyle.value['--sheet-height'], '438px')
  assert.equal(state.sheetStyle.value.bottom, '0px')
})
