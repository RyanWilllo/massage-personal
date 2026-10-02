<template>
  <main class="page admin-page" :aria-busy="ariaBusy">
    <PageNavBar :title="title" :back-text="backText" :back-to="backTo" />
    <div class="admin-content">
      <p v-if="description" class="admin-page-intro">{{ description }}</p>
      <slot />
    </div>
  </main>
</template>

<script setup>
import PageNavBar from './PageNavBar.vue'

defineProps({
  title: { type: String, required: true },
  backText: { type: String, default: '返回' },
  backTo: { type: String, default: '/more' },
  description: { type: String, default: '' },
  ariaBusy: { type: Boolean, default: false },
})
</script>

<style scoped>
.admin-page { padding-top: 0; }
.admin-content { padding-top: var(--space-3); }
.admin-page-intro {
  margin: 0 var(--space-1) var(--space-4);
  color: var(--c-text-3);
  font-size: var(--text-sm);
  line-height: 1.65;
}
</style>
