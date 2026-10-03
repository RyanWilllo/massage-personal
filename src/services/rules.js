import { readState, transaction } from '../storage/database.js'
import { calculateItem, versionAt } from '../domain/calculator.js'
import packageInfo from '../../package.json' with { type: 'json' }
import { decimal } from '../domain/precision.js'
import { businessDateTime } from '../utils/date.js'
import { DATABASE_VERSION } from '../storage/database.js'

const current = state => versionAt(state.versions, businessDateTime())
const validNumber = (value, allowZero = false) => {
  try {
    const n = decimal(value)
    if (value === '' || value == null || !n.isFinite() || !Number.isFinite(Number(value)) || (allowZero ? n.lt(0) : n.lte(0))) throw new Error()
    return n.toString()
  } catch { throw new Error(allowZero ? '收入必须为大于或等于 0 的有效数值' : '数值必须大于 0') }
}
const newVersion = (state, change) => {
  const version = structuredClone(current(state))
  version.id = state.nextVersionId++
  version.effective_from = businessDateTime()
  change(version)
  state.versions.push(version)
  return version
}
export const getProjects = async () => (await readState()).projects.filter(p => p.category !== 'addon_time')
export const updateProject = (id, data) => transaction(state => {
  const project = state.projects.find(p => p.project_id === Number(id))
  if (!project || project.category === 'addon_time' || ![0, 1].includes(data.status)) throw new Error('项目状态无效')
  project.status = data.status
  return project
})
export const getBasePrice = async () => ({ base_rate: Number(current(await readState()).base_rate) })
export const updateBasePrice = data => transaction(state => ({
  base_rate: Number(newVersion(state, version => { version.base_rate = validNumber(data.base_rate) }).base_rate),
}))
export async function getIncomeRules() {
  const state = await readState(), version = current(state)
  return state.projects.filter(project => project.category !== 'addon_time').map(project => {
    const id = project.project_id, rule = version.rules[id]
    const example = rule.pay_type === 'work'
      ? calculateItem({ ...project, status: 1 }, id === 3 ? 90 : id === 1 || id === 2 ? 60 : 30, version)
      : null
    return { project_id: id, project_name: project.name, ...rule,
      rule_type: id === 1 ? 'base' : rule.pay_type === 'fixed' ? 'fixed' : [5, 6].includes(id) ? 'reference_duration' : 'multiplier',
      editable: [2, 3, 7, 8].includes(id), current_income: example?.income ?? Number(rule.fixed_income),
      current_work_hours: example?.work_hours ?? 0 }
  })
}
export const updateIncomeRule = (id, data) => transaction(state => {
  id = Number(id)
  if (![2, 3, 7, 8].includes(id)) throw new Error('该项目倍率由计薪模型派生，不允许修改')
  const version = newVersion(state, version => {
    if ([2, 3].includes(id)) version.rules[id].work_multiplier = validNumber(data.multiplier)
    else version.rules[id].fixed_income = validNumber(data.fixed_income, true)
  })
  return version.rules[id]
})
export async function getSystemInfo() {
  const state = await readState()
  return { version: packageInfo.version, schema_version: DATABASE_VERSION,
    project_count: state.projects.length, record_count: state.services.length,
    first_date: state.services.map(s => s.service_date).sort()[0] ?? '—' }
}
