import { defineStore } from 'pinia'
import { ref } from 'vue'
export interface Notice {
  id: number
  type: 'success' | 'error' | 'info'
  title?: string
  message: string
}

interface NoticeOptions {
  title?: string
  duration?: number
}

export const useNotificationStore = defineStore('notifications', () => {
  const notices = ref<Notice[]>([])
  let nextId = 1
  const push = (message: string, type: Notice['type'] = 'success', options: NoticeOptions = {}) => {
    const id = nextId++
    notices.value.push({ id, message, type, title: options.title })
    const duration = options.duration ?? (type === 'error' ? 7000 : 3500)
    setTimeout(() => (notices.value = notices.value.filter((n) => n.id !== id)), duration)
  }
  const remove = (id: number) => {
    notices.value = notices.value.filter((notice) => notice.id !== id)
  }
  return { notices, push, remove }
})
