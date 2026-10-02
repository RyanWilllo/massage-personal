<template>
  <div class="month-calendar">
    <div v-for="weekday in WEEKDAYS" :key="weekday" class="month-calendar__weekday">{{ weekday }}</div>
    <template v-for="cell in cells" :key="cell.key">
      <span v-if="!cell.date" class="month-calendar__day month-calendar__day--blank" aria-hidden="true"></span>
      <button
        v-else-if="interactive"
        type="button"
        class="month-calendar__day"
        :class="dayClasses(cell)"
        :disabled="cell.isFuture"
        :aria-current="cell.isToday ? 'date' : undefined"
        :aria-label="ariaLabel(cell)"
        @click="$emit('select', cell.date)"
      >
        <span class="month-calendar__number">{{ cell.dayNum }}</span>
        <span v-if="cell.data" class="month-calendar__value">{{ formatMoney(cell.data.income) }}</span>
      </button>
      <div v-else class="month-calendar__day month-calendar__day--readonly" :class="dayClasses(cell)">
        <span class="month-calendar__number">{{ cell.dayNum }}</span>
        <span v-if="cell.data" class="month-calendar__value">{{ formatMoney(cell.data.income) }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { WEEKDAYS } from '../utils/calendar'
import { formatMoney } from '../utils/format'

const props = defineProps({
  cells: { type: Array, required: true },
  selectedDate: { type: String, default: '' },
  interactive: { type: Boolean, default: false },
})

defineEmits(['select'])

const dayClasses = (cell) => ({
  'month-calendar__day--today': cell.isToday,
  'month-calendar__day--active': cell.date === props.selectedDate,
  'month-calendar__day--future': cell.isFuture,
})

const ariaLabel = (cell) => {
  const amount = cell.data ? `，收入 ${formatMoney(cell.data.income)}` : '，暂无已完成服务'
  return `${cell.date}${amount}${cell.isFuture ? '，未来日期不可选择' : ''}`
}
</script>

<style scoped>
.month-calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--space-1); }
.month-calendar__weekday { padding: var(--space-1) 0; color: var(--c-text-3); font-size: var(--text-xs); text-align: center; }
.month-calendar__day {
  display: flex;
  width: 100%;
  min-height: 44px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 2px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-inner);
  background: var(--c-card);
  color: var(--c-text);
  font: inherit;
  text-align: center;
}
button.month-calendar__day { cursor: pointer; }
button.month-calendar__day:active { opacity: .82; }
.month-calendar__day--active { border-color: var(--c-primary); background: var(--c-primary-soft); }
.month-calendar__day--today { box-shadow: inset 0 0 0 1px var(--c-primary); }
.month-calendar__day--future { cursor: not-allowed; background: var(--c-surface-muted); opacity: .35; }
.month-calendar__day--blank { border-color: transparent; background: transparent; }
.month-calendar__day--readonly { cursor: default; }
.month-calendar__number { color: var(--c-text); font-size: 13px; font-weight: 600; }
.month-calendar__value { margin-top: 2px; color: var(--c-income-text); font-size: 10px; font-weight: 700; }
@media (min-width: 768px) {
  .month-calendar { gap: 6px; }
}
</style>
