import 'fake-indexeddb/auto'
import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { closeDatabase, DATABASE_NAME, readState, transaction } from '../src/storage/database.js'
import { initialState } from '../src/domain/defaults.js'
import { quickService, getService, listServices, deleteServiceItem, updateServiceTime, updateServiceRemark, deleteService } from '../src/services/records.js'
import { updateBasePrice, updateIncomeRule, updateProject } from '../src/services/rules.js'
import { getMonthlyCalendar, getMonthlyStats, getAvailableMonths } from '../src/services/statistics.js'

beforeEach(async () => {
  await closeDatabase()
  await new Promise((resolve, reject) => { const r = indexedDB.deleteDatabase(DATABASE_NAME); r.onsuccess = resolve; r.onerror = reject })
})
const data = (items = [{ project_id: 1, duration_minutes: 60 }]) => ({ service_date: '2026-07-15', service_items: items })

test('saved record, rule edits and remark persist across database reopen', async () => {
  const service = await quickService(data())
  await updateServiceRemark(service.service_id, '偏好热敷')
  await updateBasePrice({ base_rate: 55 })
  await closeDatabase()
  const saved = await getService(service.service_id)
  assert.equal(saved.remark, '偏好热敷'); assert.equal(saved.total_income, 40)
  assert.equal((await readState()).versions.at(-1).base_rate, '55')
})
test('invalid items abort entire transaction including ID increments', async () => {
  await assert.rejects(quickService(data([{ project_id: 1, duration_minutes: 60 }, { project_id: 2, duration_minutes: 14 }])))
  const state = await readState()
  assert.equal(state.services.length, 0); assert.equal(state.nextItemId, 1); assert.equal(state.nextServiceId, 1)
})
test('transactions serialize concurrent saves without losing records', async () => {
  const results = await Promise.all(Array.from({ length: 12 }, () => quickService(data())))
  assert.equal(new Set(results.map(s => s.service_id)).size, 12)
  assert.equal((await readState()).services.length, 12)
})
test('multi-project selection, addons and referred bonus persist', async () => {
  const service = await quickService({ ...data([{ project_id: 1, duration_minutes: 60 }, { project_id: 5 }]),
    addons: [{ project_id: 7 }], referred: true })
  assert.deepEqual(service.items.map(i => i.item_type), ['main', 'extra_work', 'extra_income'])
  assert.equal(service.total_work_hours, 1.5); assert.equal(service.total_income, 66)
})
test('exclusive, duplicate and disabled project boundaries', async () => {
  await assert.rejects(quickService({ ...data([{ project_id: 3, duration_minutes: 105 }]), addons: [{ project_id: 8 }] }))
  await assert.rejects(quickService(data([{ project_id: 1, duration_minutes: 60 }, { project_id: 1, duration_minutes: 90 }])))
  await updateProject(1, { status: 0 })
  await assert.rejects(quickService(data()))
  assert.equal((await readState()).services.length, 0)
})
test('old months remain editable without settlement gates', async () => {
  const service = await quickService(data())
  await updateServiceTime(service.service_id, { start_time: '09:00', end_time: '10:30' })
  const changed = await getService(service.service_id)
  assert.equal(changed.total_income, 40); assert.equal(changed.total_work_hours, 1)
  await deleteService(service.service_id)
  await assert.rejects(getService(service.service_id))
})
test('main deletion promotes other work item, cannot delete only anchor', async () => {
  const service = await quickService(data([{ project_id: 1, duration_minutes: 60 }, { project_id: 5 }]))
  const result = await deleteServiceItem(service.service_id, service.items[0].item_id)
  assert.equal(result.items[0].item_type, 'main'); assert.equal(result.total_income, 20)
  await assert.rejects(deleteServiceItem(service.service_id, result.items[0].item_id))
  assert.equal((await getService(service.service_id)).items.length, 1)
})
test('wrong record item id cannot delete a different service item', async () => {
  const first = await quickService(data()), second = await quickService(data())
  await assert.rejects(deleteServiceItem(first.service_id, second.items[0].item_id))
  assert.equal((await getService(second.service_id)).items.length, 1)
})
test('deleting addon recalculates saved snapshots rather than new rules', async () => {
  const service = await quickService({ ...data(), addons: [{ project_id: 7 }], referred: true })
  await updateBasePrice({ base_rate: 100 }); await updateIncomeRule(7, { fixed_income: 9 })
  const changed = await deleteServiceItem(service.service_id, service.items[1].item_id)
  assert.equal(changed.total_income, 42); assert.equal(changed.referred_bonus, 2)
})
test('historical rule selection and immutable version copying', async () => {
  await updateIncomeRule(2, { multiplier: 3 })
  const historical = await quickService(data([{ project_id: 2, duration_minutes: 60 }]))
  assert.equal(historical.total_income, 80)
  const state = await readState()
  assert.equal(state.versions[0].rules[2].work_multiplier, '2')
  assert.equal(state.versions[1].rules[2].work_multiplier, '3')
  await assert.rejects(updateIncomeRule(1, { multiplier: 2 }))
})
test('invalid rules roll back without adding a version', async () => {
  for (const value of [0, -1, '', Infinity, 'NaN', null]) await assert.rejects(updateBasePrice({ base_rate: value }))
  assert.equal((await readState()).versions.length, 1)
})
test('daily, monthly and calendar totals use full dataset before pagination', async () => {
  await quickService(data([{ project_id: 3, duration_minutes: 105 }]))
  await quickService({ ...data(), referred: true })
  const list = await listServices({ date: '2026-07-15', size: 1 })
  const monthly = await getMonthlyStats('2026-07'), calendar = await getMonthlyCalendar('2026-07')
  assert.equal(list.services.length, 1); assert.equal(list.total, 2)
  assert.equal(list.daily_summaries['2026-07-15'].total_income, 147)
  assert.equal(monthly.total_income, 147); assert.equal(monthly.total_work_hours, 3.625)
  assert.equal(calendar.days[0].income, 147); assert.equal(calendar.days[0].work_hours, 3.625)
  assert.ok((await getAvailableMonths()).includes('2026-07'))
})
test('empty month returns zero and invalid month rejected', async () => {
  assert.equal((await getMonthlyStats('2026-07')).total_income, 0)
  await assert.rejects(getMonthlyStats('2026-13'))
})
test('asynchronous transaction callback rejected without saving', async () => {
  await assert.rejects(transaction(async state => { state.services.push({ service_id: 1 }) }))
  assert.deepEqual(await readState(), initialState())
})
