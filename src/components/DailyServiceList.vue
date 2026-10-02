<template>
  <div>
    <PageState v-if="loading" type="loading" message="加载中…" compact />

    <PageState
      v-else-if="errorMsg"
      type="error"
      :message="errorMsg"
      action-text="重试"
      compact
      @action="reload"
    />

    <PageState
      v-else-if="!services.length"
      type="empty"
      :title="emptyTitle"
      :message="emptyMessage"
      compact
    />

    <!-- 服务列表：仅展示服务快照，导航由个人页面自身处理。 -->
    <PersonalServiceTimeline
      v-else
      :services="services"
      @select="$router.push('/records/' + $event)"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { listServices } from '../services/records'
import PageState from './PageState.vue'
import PersonalServiceTimeline from './PersonalServiceTimeline.vue'

const props = defineProps({
  date: { type: String, required: true },
  prefetched: { type: Object, default: null },
  emptyTitle: { type: String, default: '今日暂无服务记录' },
  emptyMessage: { type: String, default: '记录第一笔服务后会显示在这里' },
})

const services = ref([])
const loading = ref(true)
const errorMsg = ref('')

const applyResult = (result) => {
  services.value = result?.services || []
}

const applyPrefetchedResult = () => {
  if (props.prefetched?.date !== props.date) return false
  applyResult(props.prefetched.result)
  loading.value = false
  errorMsg.value = ''
  return true
}

const reload = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await listServices({ date: props.date, page: 1, size: Number.MAX_SAFE_INTEGER })
    applyResult(res)
    return res
  } catch (e) {
    errorMsg.value = e.message || '加载失败'
    services.value = []
  } finally {
    loading.value = false
  }
}

// date 变化时自动刷新（首页切换日期/统计页切换选中日期）
watch([() => props.date, () => props.prefetched], () => {
  if (!applyPrefetchedResult()) reload()
})
onMounted(() => {
  if (!applyPrefetchedResult()) reload()
})

defineExpose({ reload })
</script>
