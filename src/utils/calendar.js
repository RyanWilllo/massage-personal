export const WEEKDAYS = Object.freeze(['一', '二', '三', '四', '五', '六', '日'])

// 仅根据给定月份、服务端日数据和“今天”构造展示格；不读取 API、路由或身份状态。
export function buildMonthCells(month, calendarDays = [], today = '') {
  const [year, monthNumber] = String(month).split('-').map(Number)
  if (!year || !monthNumber) return []

  const first = new Date(year, monthNumber - 1, 1)
  const dayCount = new Date(year, monthNumber, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const dayMap = Object.fromEntries(calendarDays.map(day => [day.date, day]))
  const cells = []

  for (let index = 0; index < lead; index += 1) {
    cells.push({ key: `blank-${index}`, date: null })
  }
  for (let day = 1; day <= dayCount; day += 1) {
    const date = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      key: date,
      date,
      dayNum: day,
      data: dayMap[date] || null,
      isToday: date === today,
      isFuture: date > today,
    })
  }
  return cells
}
