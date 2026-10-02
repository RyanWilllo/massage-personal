import { readState } from '../storage/database.js'
import { hours, rounded, sum } from '../domain/precision.js'
import { localMonth } from '../utils/date.js'

const validateMonth = month => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('月份格式错误')
  return month
}
export async function getMonthlyStats(month = localMonth()) {
  validateMonth(month)
  const services = (await readState()).services.filter(s => s.service_date.startsWith(month))
  return { month, total_income: rounded(sum(services.map(s => s.total_income))),
    total_work_hours: hours(sum(services.map(s => s.total_work_minutes))), service_count: services.length }
}
export async function getMonthlyCalendar(month) {
  validateMonth(month)
  const services = (await readState()).services.filter(s => s.service_date.startsWith(month))
  const dates = [...new Set(services.map(s => s.service_date))].sort()
  return { month, days: dates.map(date => {
    const rows = services.filter(s => s.service_date === date)
    return { date, income: rounded(sum(rows.map(s => s.total_income))),
      work_hours: hours(sum(rows.map(s => s.total_work_minutes))), service_count: rows.length }
  }) }
}
export async function getAvailableMonths() {
  const current = localMonth(), months = []
  for (let year = 2026, month = 7; ; month += 1) {
    if (month > 12) { month = 1; year += 1 }
    const value = `${year}-${String(month).padStart(2, '0')}`
    if (value > current) break
    months.push(value)
  }
  return months.reverse()
}
