<template>
  <div
    class="page-state"
    :class="{ 'page-state--compact': compact }"
    :role="type === 'error' ? 'alert' : 'status'"
    :aria-live="type === 'error' ? 'assertive' : 'polite'"
  >
    <van-loading v-if="type === 'loading'" size="24px">{{ message || '加载中…' }}</van-loading>
    <template v-else>
      <van-icon :name="iconName" :color="iconColor" size="44" />
      <div v-if="title" class="page-state__title">{{ title }}</div>
      <div v-if="message" class="page-state__message">{{ message }}</div>
      <van-button v-if="actionText" size="small" plain type="primary" class="page-state__action" @click="$emit('action')">
        {{ actionText }}
      </van-button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, default: 'empty' }, // loading | empty | error
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  actionText: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

defineEmits(['action'])

const iconName = computed(() => (props.type === 'error' ? 'warning-o' : 'search'))
const iconColor = computed(() => (props.type === 'error' ? 'var(--c-danger)' : 'var(--c-text-3)'))
</script>

<style scoped>
.page-state {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  color: var(--c-text-3);
  text-align: center;
}
.page-state--compact { min-height: 120px; padding: var(--space-5) var(--space-3); }
.page-state__title {
  margin-top: var(--space-3);
  color: var(--c-text-2);
  font-size: 15px;
  font-weight: 600;
}
.page-state__message {
  margin-top: 6px;
  color: var(--c-text-3);
  font-size: 13px;
  line-height: 1.5;
}
.page-state__action { margin-top: var(--space-4); }
</style>
