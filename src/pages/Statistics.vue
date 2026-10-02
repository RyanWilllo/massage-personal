<template>
  <main class="page stats-page">
    <PageHeader title="统计" />

    <van-action-sheet v-model:show="showCalMonthPicker" title="选择月份">
      <div class="month-picker-list">
        <van-button
          v-for="month in selectableMonths"
          :key="month"
          :type="month === calMonth ? 'primary' : 'default'"
          size="small"
          @click="selectCalMonth(month)"
        >{{ month }}</van-button>
      </div>
    </van-action-sheet>

    <PageState v-if="initialLoading" type="loading" message="加载统计数据…" />
    <PageState
      v-else-if="loadError"
      type="error"
      :message="loadError"
      action-text="重试"
      @action="loadPage"
    />

    <template v-else>
      <MetricStrip class="month-metrics" aria-label="本月汇总" :items="summaryMetrics" />

      <section class="card calendar-card" aria-label="月历">
        <div class="calendar-card-head">
          <div>
            <h2>{{ calMonth }} 月历</h2>
          </div>
          <div class="calendar-head-actions">
            <van-loading v-if="refreshing" size="18px" aria-label="正在刷新月历" />
            <van-button size="small" plain type="primary" @click="showCalMonthPicker = true">
              选择月份 <van-icon name="arrow-down" />
            </van-button>
          </div>
        </div>
        <MonthCalendar :cells="calCells" :selected-date="calSelectedDate" interactive @select="pickCalDay" />
      </section>

      <section v-if="calSelectedDate" class="stats-day-detail" :aria-label="`${calSelectedDate} 当日服务详情`">
        <div class="detail-head">
          <div>
            <div class="detail-date">{{ calSelectedDate }}</div>
            <h2>当日服务详情</h2>
          </div>
          <van-button
            v-if="calSelectedDate < localDate()"
            type="primary"
            plain
            size="small"
            @click="startBackfill"
          >补录当日服务</van-button>
        </div>
        <DailyServiceList ref="dailyServiceList" :date="calSelectedDate" />
      </section>
    </template>

    <ServiceRecordFlow ref="backfillFlow" @submitted="handleBackfillSubmitted" />
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getAvailableMonths, getMonthlyCalendar, getMonthlyStats } from '../services/statistics'
import DailyServiceList from '../components/DailyServiceList.vue'
import MetricStrip from '../components/MetricStrip.vue'
import MonthCalendar from '../components/MonthCalendar.vue'
import PageHeader from '../components/PageHeader.vue'
import PageState from '../components/PageState.vue'
import ServiceRecordFlow from '../components/ServiceRecordFlow.vue'
import { useFeedback } from '../composables/useFeedback'
import { buildMonthCells } from '../utils/calendar'
import { localDate, localMonth } from '../utils/date'
import { formatMoney } from '../utils/format'

const backfillFlow = ref(null)
const dailyServiceList = ref(null)
const showCalMonthPicker = ref(false)
const calMonth = ref('')
const calSelectedDate = ref('')
const availableMonths = ref([])
const calendarDays = ref([])
const monthlyData = ref({ total_income: 0, total_work_hours: 0, service_count: 0 })
const initialLoading = ref(true)
const refreshing = ref(false)
const loadError = ref('')
const feedback = useFeedback()
function dateForMonth(month) {
  const today = localDate()
  if (month === today.slice(0, 7)) return today
  const [year, monthNumber] = month.split('-').map(Number)
  return `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`
}

const selectableMonths = computed(() => [...new Set([localMonth(), calMonth.value, ...availableMonths.value].filter(Boolean))].sort().reverse())

const calCells = computed(() => buildMonthCells(calMonth.value, calendarDays.value, localDate()))
const summaryMetrics = computed(() => [
  { label: '本月收入', value: formatMoney(monthlyData.value.total_income), tone: 'income' },
  { label: '本月工时', value: `${monthlyData.value.total_work_hours}h`, tone: 'primary' },
  { label: '服务次数', value: `${monthlyData.value.service_count}次`, tone: 'success' },
])

const loadMonthData = async (month = calMonth.value) => {
  const [calendar, stats] = await Promise.all([
    getMonthlyCalendar(month),
    getMonthlyStats(month),
  ])
  calMonth.value = month
  calendarDays.value = calendar?.days || []
  monthlyData.value = stats || { total_income: 0, total_work_hours: 0, service_count: 0 }

}

const loadPage = async () => {
  initialLoading.value = true
  loadError.value = ''
  try {
    availableMonths.value = await getAvailableMonths() || []
    await loadMonthData()
  } catch (error) {
    loadError.value = error.message || '加载统计数据失败'
  } finally {
    initialLoading.value = false
  }
}

const selectCalMonth = async (month) => {
  if (month === calMonth.value) {
    showCalMonthPicker.value = false
    return
  }
  showCalMonthPicker.value = false
  refreshing.value = true
  try {
    await loadMonthData(month)
    calSelectedDate.value = dateForMonth(month)
  } catch (error) {
    feedback.error(error.message || '刷新月份数据失败，请重试')
  } finally {
    refreshing.value = false
  }
}

const pickCalDay = (date) => { calSelectedDate.value = date }
const startBackfill = () => backfillFlow.value?.open(calSelectedDate.value)

const handleBackfillSubmitted = async () => {
  refreshing.value = true
  try {
    await loadMonthData()
    await dailyServiceList.value?.reload()
  } catch (error) {
    feedback.error(error.message || '刷新统计数据失败，请重试')
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  calMonth.value = localMonth()
  calSelectedDate.value = localDate()
  loadPage()
})

</script>

<style scoped>
.month-picker-list { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px max(18px, env(safe-area-inset-bottom)); }
.month-metrics { margin-bottom: 12px; }
.calendar-card { padding: 14px 10px 12px; }
.calendar-card-head { display: flex; align-items: flex-end; justify-content: space-between; padding: 0 6px 10px; }
.calendar-head-actions { display: flex; align-items: center; gap: 10px; }
.calendar-card-head h2, .detail-head h2 { color: var(--c-text); font-size: 16px; line-height: 1.25; margin-top: 3px; }
.stats-day-detail { margin-top: 18px; }
.detail-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 0 4px 8px; }
.detail-date { color: var(--c-text-3); font-size: 14px; font-variant-numeric: tabular-nums; }
@media (max-width: 359px) {
  .calendar-card { padding-left: 6px; padding-right: 6px; }
}
</style>
