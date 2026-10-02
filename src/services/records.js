import { readState, transaction } from '../storage/database.js'
import { calculateItem, totals, versionAt } from '../domain/calculator.js'
import { validateDate, validateRemark, validateTimes } from '../domain/serviceRules.js'
import { businessDateTime, localDate } from '../utils/date.js'
import { hours, rounded, sum } from '../domain/precision.js'

const find = (state, id) => {
  const service = state.services.find(s => s.service_id === Number(id))
  if (!service) throw new Error('服务记录不存在')
  return service
}
const present = service => ({ ...service, total_work_hours: hours(service.total_work_minutes),
  items: service.items.map(item => ({ ...item, work_hours: hours(item.work_minutes) })),
  main_project_name: service.items.find(i => i.item_type === 'main')?.project_name ?? '',
  service_project_names: service.items.filter(i => i.item_type !== 'extra_income').map(i => i.project_name).join(' + '),
})
export const getAvailableProjects = async () => (await readState()).projects.filter(p => p.status === 1)
export const getService = id => transaction(state => present(find(state, id)), 'readonly')
export const deleteService = id => transaction(state => {
  find(state, id); state.services = state.services.filter(s => s.service_id !== Number(id))
})
export async function listServices({ date, page = 1, size = 100 } = {}) {
  const state = await readState()
  const rows = state.services.filter(s => !date || s.service_date === date).sort((a, b) => b.service_id - a.service_id)
  const dates = [...new Set(rows.map(s => s.service_date))]
  const daily_summaries = Object.fromEntries(dates.map(day => {
    const services = rows.filter(s => s.service_date === day)
    return [day, { total_income: rounded(sum(services.map(s => s.total_income))),
      total_work_hours: hours(sum(services.map(s => s.total_work_minutes))), service_count: services.length }]
  }))
  return { services: rows.slice((page - 1) * size, page * size).map(present), total: rows.length, daily_summaries }
}

export function quickService(data) {
  validateDate(data.service_date)
  const remark = validateRemark(data.remark)
  if (data.referred !== undefined && typeof data.referred !== 'boolean') throw new Error('点钟状态无效')
  return transaction(state => {
    const selected = data.service_items
    const addons = data.addons ?? []
    if (!Array.isArray(selected) || !selected.length || !Array.isArray(addons)) throw new Error('至少选择一个服务项目')
    const entries = [...selected, ...addons]
    const ids = entries.map(entry => entry.project_id)
    if (new Set(ids).size !== ids.length) throw new Error('同一项目只能选择一次')
    const projects = entries.map(entry => state.projects.find(p => p.project_id === entry.project_id))
    if (projects.some(p => !p || p.status !== 1)) throw new Error('项目不存在或已停用')
    if (projects.slice(0, selected.length).some(p => p.main_eligible !== 1) ||
        projects.slice(selected.length).some(p => p.category !== 'extra_income')) throw new Error('项目类型无效')
    if (projects.some(p => p.exclusive) && entries.length !== 1) throw new Error('上门服务不可搭配其他项目')
    const date = data.service_date
    const now = businessDateTime()
    // Quick records retain the current workflow's timestamp defaults. Actual
    // project durations are independent of recorded start/end timestamps.
    const times = data.start_time || data.end_time
      ? validateTimes(date, data.start_time, data.end_time)
      : { start_time: `${date} ${now.slice(11)}`, end_time: `${date} ${now.slice(11)}` }
    const version = versionAt(state.versions, times.start_time)
    const items = entries.map((entry, index) => ({ ...calculateItem(projects[index], entry.duration_minutes, version),
      item_id: state.nextItemId++, project_id: entry.project_id, project_name: projects[index].name,
      item_type: index === 0 ? 'main' : index < selected.length ? 'extra_work' : 'extra_income', rule_version_id: version.id }))
    const service = { service_id: state.nextServiceId++, service_date: date, ...times, status: 'completed',
      is_referred: Number(Boolean(data.referred)), remark, items, ...totals(items, data.referred) }
    state.services.push(service)
    return present(service)
  })
}
export const updateServiceRemark = (id, remark) => transaction(state => {
  const service = find(state, id); service.remark = validateRemark(remark); return present(service)
})
export const updateServiceTime = (id, data) => transaction(state => {
  const service = find(state, id)
  Object.assign(service, validateTimes(service.service_date, data.start_time, data.end_time))
  return present(service)
})
export const deleteServiceItem = (id, itemId) => transaction(state => {
  const service = find(state, id)
  const item = service.items.find(i => i.item_id === Number(itemId))
  if (!item) throw new Error('明细不存在')
  const remaining = service.items.filter(i => i.item_id !== Number(itemId))
  if (item.item_type === 'main') {
    const replacement = remaining.find(i => i.item_type === 'extra_work')
    if (!replacement) throw new Error('不能删除唯一主项目，请删除整张服务记录')
    replacement.item_type = 'main'
  }
  service.items = remaining
  Object.assign(service, totals(remaining, service.is_referred))
  return present(service)
})
