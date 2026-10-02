let registration
let offlineReady = false
let updateReady = false
const emit = () => window.dispatchEvent(new Event('pwa-state'))
export const getPwaState = () => ({ offlineReady, updateReady })

export async function registerPwa() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  try {
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL, updateViaCache: 'none',
    })
    const ready = await navigator.serviceWorker.ready
    offlineReady = Boolean(ready.active)
    updateReady = Boolean(registration.waiting)
    emit()
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed') {
          offlineReady = true
          updateReady = Boolean(registration.waiting && navigator.serviceWorker.controller)
          emit()
        }
      })
    })
    if (navigator.storage?.persist) void navigator.storage.persist().catch(() => {})
  } catch { offlineReady = false; emit() }
}
export async function checkForUpdate() {
  if (!navigator.onLine) throw new Error('当前离线')
  if (!registration) await registerPwa()
  if (!registration) throw new Error('无法检查更新')
  await registration.update()
  updateReady = Boolean(registration.waiting)
  emit()
}
export function applyUpdate() {
  if (!registration?.waiting) return
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' })
}
