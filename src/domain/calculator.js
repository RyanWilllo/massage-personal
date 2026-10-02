import { decimal, hours, rounded, sum } from './precision.js'

export function versionAt(versions, occurredAt) {
  const versionsBefore = versions.filter(v => v.effective_from <= occurredAt)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from) || b.id - a.id)
  if (!versionsBefore.length) throw new Error('该日期尚无生效的计薪规则')
  return versionsBefore[0]
}

export function calculateItem(project, duration, version) {
  if (!project || project.status !== 1) throw new Error('项目不存在或已停用')
  const rule = version.rules[project.project_id]
  if (!rule) throw new Error('项目缺少计薪规则')
  if (rule.pay_type === 'fixed') return { duration_minutes: 0, work_minutes: 0,
    income: rounded(rule.fixed_income), work_hours: 0 }
  const actual = duration ?? (project.durations.length === 1 ? project.durations[0] : null)
  if (!Number.isInteger(actual) || !project.durations.includes(actual)) throw new Error('请选择支持的服务时长')
  const work = decimal(actual).times(rule.work_multiplier)
  return { duration_minutes: actual, work_minutes: work.toNumber(),
    income: rounded(work.div(60).times(version.base_rate)), work_hours: hours(work) }
}

export function totals(items, referred) {
  const minutes = sum(items.map(item => item.work_minutes))
  const projectIncome = rounded(sum(items.map(item => item.income)))
  const bonus = referred ? rounded(minutes.div(30)) : 0
  return { total_work_minutes: minutes.toNumber(), total_work_hours: hours(minutes),
    project_income: projectIncome, referred_bonus: bonus,
    total_income: rounded(decimal(projectIncome).plus(bonus)) }
}
