<template>
  <main class="page dashboard-page" :aria-busy="initialLoading || loading">
    <PageState v-if="initialLoading" type="loading" message="加载今日数据…" />
    <PageState
      v-else-if="loadError"
      type="error"
      :message="loadError"
      action-text="重试"
      @action="retry"
    />
    <template v-else>
      <PageHeader title="今日">
        <template #aside>{{ displayDate }}</template>
      </PageHeader>

      <section class="hero-card" aria-label="今日收入">
        <div class="hero-label">今日收入</div>
        <div class="hero-value">{{ formatMoney(daily.total_income) }}</div>
      </section>

      <section class="quick-stats" aria-label="今日概览">
        <div class="quick-stat">
          <div class="quick-stat-label">计薪工时</div>
          <div class="stat-value">{{ daily.total_work_hours }}<small>h</small></div>
        </div>
        <div class="quick-stat">
          <div class="quick-stat-label">服务次数</div>
          <div class="stat-value">{{ daily.service_count }}<small>次</small></div>
        </div>
      </section>

      <section class="record-cta" aria-label="记录服务">
        <van-button type="primary" round block size="large" class="record-btn" @click="startRecord">
          <van-icon name="plus" />
          <span>记录服务</span>
        </van-button>
      </section>

      <section class="detail-section">
        <div class="section-heading">
          <h2>今日记录</h2>
        </div>
        <DailyServiceList :date="todayStr" :prefetched="prefetchedServices" />
      </section>
    </template>

    <ServiceRecordFlow ref="recordFlow" @submitted="handleRecordSubmitted" />
  </main>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { listServices } from '../services/records'
import { formatDate, formatMoney } from '../utils/format'
import { localDate } from '../utils/date'
import ServiceRecordFlow from '../components/ServiceRecordFlow.vue'
import PageHeader from '../components/PageHeader.vue'
import PageState from '../components/PageState.vue'
import DailyServiceList from '../components/DailyServiceList.vue'
import { useRequest } from '../composables/useRequest'

const todayStr = ref(localDate())
const daily = ref({ total_income: 0, total_work_hours: 0, service_count: 0 })
const recordFlow = ref(null)
const prefetchedServices = ref(null)
const initialLoading = ref(true)
const displayDate = computed(() => formatDate(todayStr.value))

const { run: refreshAll, error: loadError, loading } = useRequest(async () => {
  const nextDate = localDate()
  const result = await listServices({ date: nextDate, page: 1, size: 100 })
  todayStr.value = nextDate
  daily.value = result?.daily_summaries?.[nextDate] || {
    total_income: 0,
    total_work_hours: 0,
    service_count: 0,
  }
  // 首页由同一份服务列表响应提供汇总，子组件直接消费该预取结果而不再重复请求。
  prefetchedServices.value = { date: nextDate, result }
})

const initialize = async () => {
  try {
    await refreshAll()
  } catch {
    // 错误状态已由 useRequest 提供给 PageState。
  } finally {
    initialLoading.value = false
  }
}

const retry = async () => {
  try {
    await refreshAll()
  } catch {
    // 错误状态已由 useRequest 提供给 PageState。
  }
}

const handleRecordSubmitted = async () => {
  try {
    await refreshAll()
  } catch {
    // 错误状态已由 useRequest 提供给 PageState。
  }
}

const refreshOnVisible = () => { if (document.visibilityState === 'visible') void retry() }
onMounted(() => { initialize(); document.addEventListener('visibilitychange', refreshOnVisible) })
onBeforeUnmount(() => document.removeEventListener('visibilitychange', refreshOnVisible))

const startRecord = () => recordFlow.value?.open(localDate())
</script>

<style scoped>
.dashboard-page { padding-top: 16px; }
.hero-card { margin-bottom: 12px; }
.quick-stats { display:flex; gap:12px; margin-bottom:16px; }
.quick-stat { text-align: left; padding: 14px 14px 12px; }
.quick-stat-label { color: var(--c-text-2); font-size: 14px; }
.quick-stat .stat-value { margin-top: 6px; color: var(--c-text); }
.record-cta { margin-bottom: 24px; }
.record-btn { font-weight: 600; }
.record-btn .van-icon { margin-right: 6px; font-size: 17px; vertical-align: -2px; }
.detail-section { margin-top: 4px; }
.section-heading {
  display: flex; justify-content: space-between; align-items: center;
  margin: 0 4px 8px;
}
.section-heading h2 { color: var(--c-text); font-size: 17px; line-height: 1.25; margin-top: 4px; }
</style>
