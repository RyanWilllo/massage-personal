import { showNotify, showToast } from 'vant'

export function useFeedback() {
  const success = (message) => showNotify({ type: 'success', message })
  const warning = (message) => showNotify({ type: 'warning', message })
  const error = (message) => showNotify({ type: 'danger', message })
  const toast = (message) => showToast(message)

  return { success, warning, error, toast }
}
