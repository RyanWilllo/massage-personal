import { decimal, sum } from '../domain/precision.js'
import { initialState } from '../domain/defaults.js'
import { transaction, readState, closeDatabase } from '../storage/database.js'

const invalid = () => { throw new Error('旧记录或规则不完整，已停止迁入，原有数据未改变') }
const id = value => { if (!Number.isSafeInteger(value) || value < 1 || value >= Number.MAX_SAFE_INTEGER) invalid(); return value }
const number = value => {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value) || value.length > 50 || !decimal(value).isFinite() || !Number.isFinite(Number(value))) invalid()
  return decimal(value)
}
const keys = (object, expected) => {
  if (!object || typeof object !== 'object' || Array.isArray(object) || Object.keys(object).sort().join('|') !== expected.split(' ').sort().join('|')) invalid()
}
const unique = (rows, field) => {
  if (!Array.isArray(rows) || new Set(rows.map(row => id(row[field]))).size !== rows.length) invalid()
  return new Set(rows.map(row => row[field]))
}
export const sha256 = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(n => n.toString(16).padStart(2, '0')).join('')

export function monthlyReconciliation(services) {
  return [...new Set(services.map(s => s.service_date.slice(0, 7)))].sort().map(month => {
    const rows = services.filter(s => s.service_date.startsWith(month))
    return { month, service_count: rows.length, item_count: rows.reduce((n, s) => n + s.items.length, 0),
      income: sum(rows.map(s => s.total_income)).toString(), work_minutes: sum(rows.map(s => s.total_work_minutes)).toString() }
  })
}
export function validateSource(data) {
  keys(data, 'projects versions services')
  const projects = unique(data.projects, 'project_id'), versions = unique(data.versions, 'id')
  unique(data.services, 'service_id')
  if (!projects.size || !versions.size) invalid()
  for (const p of data.projects) {
    keys(p, 'project_id name category main_eligible status exclusive category_label durations')
    if (typeof p.name !== 'string' || !p.name || !['main', 'extra_work', 'extra_income', 'addon_time'].includes(p.category) || ![0, 1].includes(p.main_eligible) || ![0, 1].includes(p.status) || p.exclusive !== (p.project_id === 3) || typeof p.category_label !== 'string' || !Array.isArray(p.durations) || p.durations.some(n => !Number.isInteger(n) || n < 0)) invalid()
  }
  for (const v of data.versions) {
    keys(v, 'id effective_from base_rate rules')
    if (typeof v.effective_from !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v.effective_from) || number(v.base_rate).lte(0)) invalid()
    if (!v.rules || typeof v.rules !== 'object' || Array.isArray(v.rules)) invalid()
    for (const [pid, rule] of Object.entries(v.rules)) {
      if (!projects.has(Number(pid))) invalid()
      if (rule.pay_type === 'work') {
        keys(rule, 'pay_type work_multiplier'); if (number(rule.work_multiplier).lte(0)) invalid()
      } else if (rule.pay_type === 'fixed') {
        keys(rule, 'pay_type fixed_income'); number(rule.fixed_income)
      } else invalid()
    }
    for (const p of data.projects.filter(p => p.category !== 'addon_time')) if (!v.rules[p.project_id]) invalid()
  }
  const itemIds = new Set()
  for (const s of data.services) {
    keys(s, 'service_id service_date start_time end_time status is_referred remark total_work_minutes total_income referred_bonus items')
    if (s.status !== 'completed' || ![0, 1].includes(s.is_referred) || (s.remark !== null && typeof s.remark !== 'string') || typeof s.service_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.service_date) || ![s.start_time, s.end_time].every(t => typeof t === 'string' && t.startsWith(s.service_date + ' ') && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t)) || s.end_time < s.start_time || !Array.isArray(s.items) || !s.items.length) invalid()
    for (const i of s.items) {
      keys(i, 'item_id project_id project_name item_type rule_version_id duration_minutes work_minutes income')
      id(i.item_id)
      if (itemIds.has(i.item_id) || !projects.has(i.project_id) || !versions.has(i.rule_version_id) || !['main', 'extra_work', 'extra_income', 'addon_time'].includes(i.item_type) || typeof i.project_name !== 'string') invalid()
      itemIds.add(i.item_id); number(i.duration_minutes); number(i.work_minutes); number(i.income)
    }
    if (s.items.filter(i => i.item_type === 'main').length !== 1 || !number(s.total_work_minutes).eq(sum(s.items.map(i => i.work_minutes))) || !number(s.total_income).eq(sum(s.items.map(i => i.income)).plus(number(s.referred_bonus))) || (s.is_referred === 0 && !number(s.referred_bonus).isZero())) invalid()
  }
  return data
}

export async function prepareMigration(payload) {
  if (!payload || payload.format !== 'massage-personal-transfer-v1' || payload.frozen !== true || typeof payload.wire !== 'string' || payload.wire.length > 30_000_000 || !/^[a-f0-9]{64}$/.test(payload.sha256) || await sha256(payload.wire) !== payload.sha256) invalid()
  const data = validateSource(JSON.parse(payload.wire))
  const months = monthlyReconciliation(data.services)
  if (!Array.isArray(payload.months) || months.length !== payload.months.length || months.some((m, n) => {
    const row = payload.months[n]; keys(row, 'month service_count item_count income work_minutes')
    return Object.keys(m).some(key => m[key] !== row[key])
  })) invalid()
  return { data, months, sha256: payload.sha256 }
}

export async function receiveMigration(token) {
  if (!token || token.length > 4096 || /\s/.test(token)) throw new Error('请粘贴有效迁移码')
  const response = await fetch('https://xiaolo.xyz/api/personal-transfer/receive', {
    method: 'GET', headers: { Authorization: `Bearer ${token}` }, credentials: 'omit',
    cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(60_000),
  })
  const body = await response.json()
  if (!response.ok || body.code !== 0) throw new Error(body.message || '读取失败，请重新取得迁移码')
  return prepareMigration(body.data)
}

export async function importMigration(prepared) {
  // Revalidate the in-memory preview immediately before committing; never
  // trust an old preview if another tab has written meanwhile.
  validateSource(prepared.data)
  if (await sha256(JSON.stringify(prepared.data)) !== prepared.sha256 || JSON.stringify(monthlyReconciliation(prepared.data.services)) !== JSON.stringify(prepared.months)) invalid()
  await transaction(state => {
    if (state.migration) throw new Error('已迁入过旧记录，请勿重复迁入')
    if (JSON.stringify(state) !== JSON.stringify(initialState())) throw new Error('个人版已有记录或规则修改，不能覆盖；请联系小罗核对')
    const source = structuredClone(prepared.data)
    Object.assign(state, source, {
      nextServiceId: source.services.reduce((n, s) => Math.max(n, s.service_id), 0) + 1,
      nextItemId: source.services.reduce((n, s) => s.items.reduce((k, i) => Math.max(k, i.item_id), n), 0) + 1,
      nextVersionId: source.versions.reduce((n, v) => Math.max(n, v.id), 0) + 1,
      migration: { status: 'pending', sha256: prepared.sha256, months: prepared.months },
    })
  })
  return verifySavedMigration()
}

export async function verifySavedMigration() {
  await closeDatabase()
  const state = await readState()
  if (!state.migration) throw new Error('尚未迁入旧记录')
  if (state.migration.status === 'verified') return state.migration
  const data = { projects: state.projects, versions: state.versions, services: state.services }
  validateSource(data)
  if (await sha256(JSON.stringify(data)) !== state.migration.sha256 || JSON.stringify(monthlyReconciliation(data.services)) !== JSON.stringify(state.migration.months)) throw new Error('手机保存核对未通过，请停止录入并联系小罗')
  return transaction(saved => {
    if (JSON.stringify(saved.migration) !== JSON.stringify(state.migration)) throw new Error('迁入状态已变化，请重试核对')
    saved.migration.status = 'verified'
    return saved.migration
  }, 'readwrite', { allowPendingMigration: true })
}
