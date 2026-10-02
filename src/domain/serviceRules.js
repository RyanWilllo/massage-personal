import { businessDateTime, localDate } from '../utils/date.js'

export function validateDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期格式应为 YYYY-MM-DD')
  const parsed = new Date(`${date}T00:00:00+08:00`)
  if (!Number.isFinite(parsed.getTime()) || localDate(parsed) !== date) throw new Error('日期无效')
  if (date < '2026-07-01' || date > localDate()) throw new Error('不能记录未来日期或早于 2026-07-01 的服务')
  return date
}
export function validateTimes(date, start, end) {
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/
  if (!time.test(start) || !time.test(end)) throw new Error('请选择有效的开始和结束时间')
  const normalized = text => text.length === 5 ? `${text}:00` : text
  if (normalized(end) <= normalized(start)) throw new Error('结束时间必须晚于开始时间，不支持跨日服务')
  if (date === localDate() && `${date} ${normalized(end)}` > businessDateTime()) throw new Error('当天服务时间不能晚于当前时刻')
  return { start_time: `${date} ${normalized(start)}`, end_time: `${date} ${normalized(end)}` }
}
export function validateRemark(remark) {
  if (remark != null && typeof remark !== 'string') throw new Error('备注格式错误')
  if ([...(remark ?? '')].length > 100) throw new Error('备注最多 100 个字')
  return (remark ?? '').trim()
}
