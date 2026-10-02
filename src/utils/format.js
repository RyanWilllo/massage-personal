export function formatMoney(amount) {
  const value = Number(amount)
  return '¥' + (Number.isFinite(value) ? value : 0).toFixed(1)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split(' ')[0].split('-')
  return parts[1] + '月' + parts[2] + '日'
}

export function formatTime(datetime) {
  if (!datetime) return ''
  const parts = datetime.split(' ')
  return parts.length > 1 ? parts[1].substring(0, 5) : ''
}

export function formatExpiry(value) {
  if (!value) return '—'
  return String(value)
    .trim()
    .replace('T', ' ')
    .replace(/\.\d+(?=Z?$)/, '')
    .replace(/Z$/, '')
}
