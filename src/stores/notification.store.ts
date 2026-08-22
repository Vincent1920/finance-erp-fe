import { defineStore } from 'pinia'
import { ref } from 'vue'
export interface Notice {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}
export const useNotificationStore = defineStore('notifications', () => {
  const notices = ref<Notice[]>([])
  const push = (message: string, type: Notice['type'] = 'success') => {
    const id = Date.now()
    notices.value.push({ id, message, type })
    setTimeout(() => (notices.value = notices.value.filter((n) => n.id !== id)), 3500)
  }
  return { notices, push }
})
