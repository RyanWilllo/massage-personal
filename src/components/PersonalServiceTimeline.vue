<template>
  <div class="card list-card timeline-card">
    <div class="timeline">
      <button
        v-for="service in services"
        :key="service.service_id"
        type="button"
        class="timeline-item"
        :aria-label="`查看 ${service.service_project_names || service.main_project_name || '服务'} 的详情`"
        @click="emit('select', service.service_id)"
      >
        <div class="timeline-time">{{ formatTime(service.start_time) }}–{{ formatTime(service.end_time) || '—' }}</div>
        <div class="timeline-main">
          <div class="timeline-title">
            <span class="timeline-project">{{ service.service_project_names || service.main_project_name || '未设服务项目' }}</span>
            <van-tag v-if="service.is_referred" type="danger" plain size="small">点钟</van-tag>
          </div>
          <div class="timeline-meta">{{ service.total_work_hours }}h 计薪工时</div>
        </div>
        <div class="timeline-amount">{{ formatMoney(service.total_income) }}</div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { formatMoney, formatTime } from '../utils/format'

defineProps({
  services: { type: Array, required: true },
})

const emit = defineEmits(['select'])
</script>

<style scoped>
.list-card { padding: 8px 14px 8px 12px; }
.timeline { position: relative; padding-left: 16px; }
.timeline::before {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: 2px;
  border-radius: 1px;
  background: var(--c-border);
  content: '';
}
.timeline-item {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  padding: 10px 6px 10px 10px;
  border: 0;
  border-radius: var(--space-2);
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.timeline-item::before {
  position: absolute;
  top: 50%;
  left: -14px;
  width: 8px;
  height: 8px;
  border: 2px solid var(--c-on-primary);
  border-radius: 50%;
  background: var(--c-primary);
  box-shadow: 0 0 0 2px var(--c-primary-border);
  content: '';
  transform: translateY(-50%);
}
.timeline-item + .timeline-item { border-top: 1px solid var(--c-border); }
.timeline-item:active, .timeline-item:focus-visible { background: var(--c-primary-tint); }
.timeline-time { flex: 0 0 72px; align-self: flex-start; padding-top: 1px; color: var(--c-text-3); font-size: 13px; line-height: 1.35; font-variant-numeric: tabular-nums; white-space: nowrap; }
.timeline-main { flex: 1; min-width: 0; }
.timeline-title { display: flex; align-items: center; gap: 6px; min-width: 0; }
.timeline-project { color: var(--c-text); font-size: 16px; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.timeline-meta { color: var(--c-text-3); font-size: 13px; margin-top: 3px; font-variant-numeric: tabular-nums; }
.timeline-amount { flex: 0 0 auto; color: var(--c-income-text); font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
@media (max-width: 430px) {
  .timeline-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; }
  .timeline-time { grid-column: 1 / -1; padding-top: 0; }
  .timeline-main { min-width: 0; }
  .timeline-amount { align-self: center; }
}
</style>
