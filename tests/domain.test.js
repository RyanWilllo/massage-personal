import test from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../src/domain/defaults.js'
import { calculateItem, totals, versionAt } from '../src/domain/calculator.js'
import { hours, rounded } from '../src/domain/precision.js'
import { validateDate, validateTimes, validateRemark } from '../src/domain/serviceRules.js'
import { localDate, businessDateTime } from '../src/utils/date.js'
import { readFileSync } from 'node:fs'

const state = initialState(), version = state.versions[0]
const project = id => state.projects.find(p => p.project_id === id)

test('all 4 rates and project durations match 188 original Flask calculator fixtures', () => {
  const fixtures = JSON.parse(readFileSync(new URL('./original-calculator-fixtures.json', import.meta.url)))
  assert.ok(fixtures.cases.length > 180)
  for (const row of fixtures.cases) {
    const rules = structuredClone(version); rules.base_rate = String(row.rate)
    const actual = calculateItem(project(row.project_id), row.duration ?? undefined, rules)
    assert.equal(actual.income, row.income, JSON.stringify(row))
    assert.equal(actual.work_minutes, row.work_minutes, JSON.stringify(row))
    assert.equal(actual.work_hours, row.work_hours, JSON.stringify(row))
  }
})

test('half-up money, exact 157.5 minutes and 3-place hour display', () => {
  assert.equal(rounded(5.25), 5.3)
  assert.equal(rounded(2.625, 2), 2.63)
  assert.equal(hours(157.5), 2.625)
  assert.equal(hours(1), 0.017)
})
for (const [id, duration, minutes, income] of [
  [1, 15, 15, 10], [1, 240, 240, 160], [2, 105, 210, 140],
  [3, 105, 157.5, 105], [5, undefined, 30, 20], [6, 30, 30, 20],
  [7, undefined, 0, 3], [8, undefined, 0, 2],
]) test(`default project ${id} duration ${duration} matches original model`, () => {
  const result = calculateItem(project(id), duration, version)
  assert.equal(result.work_minutes, minutes); assert.equal(result.income, income)
})
test('linear compensation rounds only once after multiplier', () => {
  const custom = structuredClone(version)
  custom.base_rate = '40.1'; custom.rules[3].work_multiplier = '1.5'
  assert.equal(calculateItem(project(3), 105, custom).income, 105.3)
})
test('saved snapshot totals and referred bonus match original Python test', () => {
  assert.deepEqual(totals([{ work_minutes: 157.5, income: 105 }, { work_minutes: 0, income: 3 }], true), {
    total_work_minutes: 157.5, total_work_hours: 2.625, project_income: 108,
    referred_bonus: 5.3, total_income: 113.3,
  })
})
test('invalid durations and disabled work projects rejected', () => {
  for (const duration of [undefined, 14, 15.5, 255, '60', NaN]) assert.throws(() => calculateItem(project(1), duration, version))
  assert.throws(() => calculateItem(project(3), 60, version))
  assert.throws(() => calculateItem({ ...project(1), status: 0 }, 60, version))
})
test('rule selection uses service occurrence time, then version id on ties', () => {
  const versions = [version, { ...version, id: 2, effective_from: '2026-09-01 00:00:00', base_rate: '45' },
    { ...version, id: 3, effective_from: '2026-09-01 00:00:00', base_rate: '50' }]
  assert.equal(versionAt(versions, '2026-08-31 23:59:59').id, 1)
  assert.equal(versionAt(versions, '2026-09-01 00:00:00').id, 3)
  assert.throws(() => versionAt(versions, '2026-06-30 23:59:59'))
})
test('business day remains Shanghai across device time zones', () => {
  assert.equal(localDate('2026-09-30T16:00:00Z'), '2026-10-01')
  assert.equal(businessDateTime('2026-09-30T16:00:00Z'), '2026-10-01 00:00:00')
})
test('strict date, time and remark validation', () => {
  for (const date of ['2026-02-31', '2026-09-31', '2026-06-30', '2099-01-01', '2026-7-1']) assert.throws(() => validateDate(date))
  assert.equal(validateDate('2026-07-01'), '2026-07-01')
  assert.deepEqual(validateTimes('2026-07-01', '09:00', '10:00'), {
    start_time: '2026-07-01 09:00:00', end_time: '2026-07-01 10:00:00',
  })
  for (const times of [['09:00', '09:00'], ['23:00', '01:00'], ['24:00', '25:00']]) assert.throws(() => validateTimes('2026-07-01', ...times))
  assert.equal(validateRemark(' 注释 '), '注释')
  assert.throws(() => validateRemark('字'.repeat(101)))
})
