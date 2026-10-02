<template>
  <span class="menu-icon" :class="`menu-icon--${tone}`" aria-hidden="true">
    <van-icon :name="name" />
  </span>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  tone: { type: String, default: 'primary' },
})
</script>

<style scoped>
.menu-icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  margin-right: var(--space-3);
  border-radius: var(--r-inner);
  color: var(--c-primary);
  background: var(--c-primary-soft);
  font-size: 17px;
}
.menu-icon--soft { background: var(--c-primary-tint); }
.menu-icon--income { color: var(--c-income-text); background: var(--c-income-soft); }
.menu-icon--success { color: var(--c-success); background: var(--c-primary-tint); }
.menu-icon--neutral { color: var(--c-text-2); background: var(--c-surface-muted); }
</style>
