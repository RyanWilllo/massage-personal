import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import 'fake-indexeddb/auto'
import { prepareMigration, importMigration, verifySavedMigration, sha256, monthlyReconciliation } from '../src/services/migration.js'
import { closeDatabase, readState, transaction, DATABASE_NAME } from '../src/storage/database.js'
import { quickService, getService, updateServiceRemark } from '../src/services/records.js'
import { updateBasePrice, getIncomeRules } from '../src/services/rules.js'
import { getMonthlyStats } from '../src/services/statistics.js'

// Generated exclusively from the old backend's synthetic owner-isolation
// fixture, including its actual JSON wire format and sorted envelope keys.
const fixture = JSON.parse(await readFile(new URL('./fixtures/synthetic-transfer.json', import.meta.url)))
beforeEach(async () => {
  await closeDatabase()
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = resolve; request.onerror = reject
  })
})
afterEach(closeDatabase)
const prepared = () => prepareMigration(structuredClone(fixture))
const data = () => ({ service_date: '2026-07-15', service_items: [{ project_id: 1, duration_minutes: 60 }] })

test('real Python wire representation reconciles and persists exact snapshots after reopening', async () => {
  const preview = await prepared()
  assert.equal(preview.months[0].income, '110.3')
  const receipt = await importMigration(preview)
  assert.equal(receipt.status, 'verified')
  await closeDatabase()
  const state = await readState()
  assert.deepEqual({ projects: state.projects, versions: state.versions, services: state.services }, preview.data)
  assert.deepEqual(state.migration.months, preview.months)
  const service = await getService(1)
  assert.equal(service.total_work_hours, 2.625)
  assert.equal(service.items[0].income, '105')
  assert.equal((await getMonthlyStats('2026-10')).total_income, 110.3)
  assert.equal((await getMonthlyStats('2026-10')).service_count, 1)
  // Historical addon_time stays in the snapshots but has no new-entry control.
  assert.ok((await getIncomeRules()).every(r => r.project_id !== 4))
})
test('edited source hash, wrong monthly totals, unknown identity fields and broken snapshots fail before saving', async () => {
  const wrongHash = structuredClone(fixture); wrongHash.wire += ' '
  await assert.rejects(prepareMigration(wrongHash))
  const wrongMonth = structuredClone(fixture); wrongMonth.months[0].income = '0'
  await assert.rejects(prepareMigration(wrongMonth))
  for (const mutate of [
    data => { data.services[0].employee_id = 2 },
    data => { data.services[0].items[0].income = '0' },
    data => { data.services[0].items[0].rule_version_id = 99999 },
    data => { data.services[0].items.push(structuredClone(data.services[0].items[0])) },
  ]) {
    const payload = structuredClone(fixture), data = JSON.parse(payload.wire)
    mutate(data); payload.wire = JSON.stringify(data); payload.sha256 = await sha256(payload.wire)
    await assert.rejects(prepareMigration(payload))
  }
  assert.equal((await readState()).services.length, 0)
})
test('nonempty phone and independently changed rules are never overwritten', async () => {
  const preview = await prepared()
  await quickService(data()); const before = await readState()
  await assert.rejects(importMigration(preview))
  assert.deepEqual(await readState(), before)
})
test('empty phone with modified rules also fails without discarding changes', async () => {
  await updateBasePrice({ base_rate: 60 }); const before = await readState()
  await assert.rejects(importMigration(await prepared()))
  assert.deepEqual(await readState(), before)
})
test('concurrent and later reimports are blocked even if imported records were removed', async () => {
  const preview = await prepared()
  const results = await Promise.allSettled([importMigration(preview), importMigration(preview)])
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal((await readState()).services.length, 1)
  await transaction(state => { state.services = [] })
  await assert.rejects(importMigration(preview))
})
test('interrupted readback blocks recording and can finish without reading the old server again', async () => {
  const preview = await prepared()
  await transaction(state => {
    Object.assign(state, structuredClone(preview.data), { migration: { status: 'pending', sha256: preview.sha256, months: preview.months } })
  })
  await assert.rejects(quickService(data()))
  await assert.rejects(updateServiceRemark(1, 'blocked'))
  assert.equal((await verifySavedMigration()).status, 'verified')
  await updateServiceRemark(1, 'allowed')
  assert.equal((await getService(1)).remark, 'allowed')
})
test('ID allocation follows preserved historical ids and edited preview cannot be committed', async () => {
  const changed = await prepared(); changed.data.services[0].remark = 'unexpected'
  await assert.rejects(importMigration(changed))
  await importMigration(await prepared())
  const state = await readState()
  assert.equal(state.nextServiceId, 2)
  assert.equal(state.nextItemId, 2)
  assert.equal(state.nextVersionId, Math.max(...state.versions.map(v => v.id)) + 1)
  const created = await quickService(data())
  assert.equal(created.service_id, 2)
  assert.equal(created.items[0].item_id, 2)
})
test('zero-history migration still preserves rules and blocks duplicate imports', async () => {
  const payload = structuredClone(fixture), data = JSON.parse(payload.wire)
  data.services = []; payload.wire = JSON.stringify(data); payload.sha256 = await sha256(payload.wire)
  payload.months = monthlyReconciliation(data.services)
  const preview = await prepareMigration(payload)
  assert.equal((await importMigration(preview)).status, 'verified')
  assert.equal((await readState()).services.length, 0)
  await assert.rejects(importMigration(preview))
})
