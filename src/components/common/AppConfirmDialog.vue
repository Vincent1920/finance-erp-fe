<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
import AppModal from './AppModal.vue'

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message: string
    confirmLabel?: string
    busy?: boolean
    danger?: boolean
  }>(),
  {
    title: 'Konfirmasi tindakan',
    confirmLabel: 'Lanjutkan',
    busy: false,
    danger: true,
  },
)
defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    size="sm"
    :close-disabled="busy"
    @close="$emit('cancel')"
  >
    <div class="flex gap-3">
      <span class="h-fit rounded-lg bg-amber-50 p-2 text-amber-600">
        <AlertTriangle class="h-5 w-5" />
      </span>
      <p class="text-sm leading-6 text-slate-600">{{ message }}</p>
    </div>
    <template #footer>
      <AppButton variant="secondary" :disabled="busy" @click="$emit('cancel')">Batal</AppButton>
      <AppButton :variant="danger ? 'danger' : 'primary'" :loading="busy" @click="$emit('confirm')">
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>
