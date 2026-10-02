import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// Place the sheet and its footer inside the visible area when a keyboard opens.
export function useSheetViewport() {
  const height = ref(0)
  const bottom = ref(0)
  let viewport
  const update = () => {
    height.value = viewport?.height ?? window.innerHeight
    bottom.value = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0
  }
  onMounted(() => {
    viewport = window.visualViewport
    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
  })
  onBeforeUnmount(() => {
    viewport?.removeEventListener('resize', update)
    viewport?.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
  })
  return computed(() => ({
    '--sheet-height': height.value ? `${Math.max(0, height.value - 12)}px` : '90vh',
    bottom: `${bottom.value}px`,
  }))
}
