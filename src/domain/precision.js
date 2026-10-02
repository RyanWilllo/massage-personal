import Decimal from 'decimal.js'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })
export const decimal = value => new Decimal(value ?? 0)
export const rounded = (value, places = 1) => {
  const result = decimal(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toNumber()
  if (!Number.isFinite(result)) throw new Error('数值过大或格式无效')
  return result
}
export const hours = minutes => rounded(decimal(minutes).div(60), 3)
export const sum = values => values.reduce((total, value) => total.plus(value ?? 0), decimal(0))
