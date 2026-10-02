<template>
  <section class="metric-strip" :aria-label="ariaLabel">
    <div v-for="item in items" :key="item.label" class="metric-strip__item">
      <div class="metric-strip__value" :class="`metric-strip__value--${item.tone || 'income'}`">{{ item.value }}</div>
      <div class="metric-strip__label">{{ item.label }}</div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, required: true },
  ariaLabel: { type: String, default: '数据汇总' },
})
</script>

<style scoped>
.metric-strip { display: flex; gap: var(--space-2); }
.metric-strip__item {
  flex: 1;
  min-width: 0;
  padding: 10px 6px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-inner);
  background: var(--c-card);
  text-align: center;
}
.metric-strip__value {
  color: var(--c-income-text);
  font-size: var(--text-subtitle);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.metric-strip__value--primary { color: var(--c-primary); }
.metric-strip__value--success { color: var(--c-success); }
.metric-strip__label { margin-top: 2px; color: var(--c-text-3); font-size: var(--text-xs); }
</style>
