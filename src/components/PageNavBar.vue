<template>
  <van-nav-bar :left-text="backText" left-arrow @click-left="goBack">
    <template #title><h1 class="page-nav-title">{{ title }}</h1></template>
  </van-nav-bar>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: { type: String, required: true },
  backText: { type: String, default: '返回' },
  backTo: { type: String, default: '/' },
  preferHistory: { type: Boolean, default: false },
})

const router = useRouter()

const goBack = () => {
  const previous = window.history.state?.back
  if (props.preferHistory && typeof previous === 'string' && previous.startsWith('/')) {
    router.back()
    return
  }
  router.push(props.backTo)
}
</script>

<style scoped>
.page-nav-title { color: inherit; font: inherit; line-height: inherit; }
</style>
