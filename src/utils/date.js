// Business dates are Asia/Shanghai even if the iPhone changes its device time zone.
export function businessDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(p => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}
export const localDate = (value = new Date()) => businessDateTime(value).slice(0, 10)
export const localMonth = (value = new Date()) => localDate(value).slice(0, 7)
