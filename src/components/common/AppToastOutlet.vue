<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notification.store'
import type { ApiErrorResponse } from '@/types/api'

const notifications = useNotificationStore()
const icons = { success: CheckCircle2, error: AlertCircle, info: Info }
const tones = {
  success: 'border-emerald-200 text-emerald-800',
  error: 'border-red-200 text-red-800',
  info: 'border-blue-200 text-blue-800',
}

const messageFromEvent = (event: Event, fallback: string) => {
  const detail = (event as CustomEvent<ApiErrorResponse | undefined>).detail
  return detail?.message ?? fallback
}
const onForbidden = (event: Event) =>
  notifications.push(
    messageFromEvent(event, 'Anda tidak memiliki izin untuk tindakan ini.'),
    'error',
  )
const onValidation = (event: Event) =>
  notifications.push(messageFromEvent(event, 'Periksa kembali data yang dimasukkan.'), 'error')
const onServerError = (event: Event) =>
  notifications.push(messageFromEvent(event, 'Server sedang mengalami kendala.'), 'error')

onMounted(() => {
  addEventListener('api:forbidden', onForbidden)
  addEventListener('api:validation', onValidation)
  addEventListener('api:server-error', onServerError)
})
onUnmounted(() => {
  removeEventListener('api:forbidden', onForbidden)
  removeEventListener('api:validation', onValidation)
  removeEventListener('api:server-error', onServerError)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="notice in notifications.notices"
          :key="notice.id"
          class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg"
          :class="tones[notice.type]"
          :role="notice.type === 'error' ? 'alert' : 'status'"
        >
          <component :is="icons[notice.type]" class="mt-0.5 h-5 w-5 shrink-0" />
          <div class="min-w-0 flex-1">
            <p v-if="notice.title" class="text-sm font-bold">{{ notice.title }}</p>
            <p class="text-sm font-medium" :class="notice.title && 'mt-1'">{{ notice.message }}</p>
          </div>
          <button
            type="button"
            aria-label="Tutup notifikasi"
            @click="notifications.remove(notice.id)"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: 180ms ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>
