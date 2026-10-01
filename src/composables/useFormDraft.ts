import { onBeforeUnmount, ref, watch, type WatchStopHandle } from 'vue'

export function useFormDraft<T>(key: string, snapshot: () => T) {
  const savedAt = ref<Date | null>(null)
  let stop: WatchStopHandle | undefined
  let timer: number | undefined

  const restore = (): T | null => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as { data?: T; savedAt?: string }
      savedAt.value = parsed.savedAt ? new Date(parsed.savedAt) : null
      return parsed.data ?? null
    } catch {
      return null
    }
  }

  const start = () => {
    if (stop) return
    stop = watch(
      snapshot,
      (data) => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          const timestamp = new Date()
          try {
            localStorage.setItem(key, JSON.stringify({ data, savedAt: timestamp.toISOString() }))
            savedAt.value = timestamp
          } catch {
            // Draft automation must never block transaction entry.
          }
        }, 500)
      },
      { deep: true },
    )
  }

  const clear = () => {
    window.clearTimeout(timer)
    localStorage.removeItem(key)
    savedAt.value = null
  }

  onBeforeUnmount(() => {
    window.clearTimeout(timer)
    stop?.()
  })

  return { clear, restore, savedAt, start }
}
