// 统一的请求状态管理：loading / error / run
// 用法：
//   const { loading, error, run } = useRequest(async () => { ... })
//   await run()  → 成功清空 error，失败写入 error
import { ref } from 'vue'

export function useRequest(fn) {
  const loading = ref(false)
  const error = ref('')

  const run = async (...args) => {
    loading.value = true
    error.value = ''
    try {
      const result = await fn(...args)
      return result
    } catch (e) {
      const msg = e?.message || '请求失败'
      error.value = msg
      throw e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, run }
}
