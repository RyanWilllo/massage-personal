<template>
  <header class="page-header">
    <div class="page-header__copy">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.aside" class="page-header__aside">
      <slot name="aside" />
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-1) var(--space-4);
}
.page-header__copy { min-width: 0; }
.page-header h1 {
  margin-top: var(--space-1);
  color: var(--c-text);
  font-size: var(--text-title);
  line-height: 1.2;
  letter-spacing: -.3px;
}
.page-header p {
  margin-top: var(--space-2);
  color: var(--c-text-3);
  font-size: var(--text-sm);
  line-height: 1.55;
}
.page-header__aside {
  flex: 0 0 auto;
  color: var(--c-text-3);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}
</style>
