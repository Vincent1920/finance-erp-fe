<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/services/api/client'
import AppButton from './AppButton.vue'
import AppConfirmDialog from './AppConfirmDialog.vue'
import { useNotificationStore } from '@/stores/notification.store'
import { getApiErrorMessage } from '@/utils/error'
const props = defineProps<{ kind: string; id: number; status: string }>(),
  emit = defineEmits<{ deleted: [] }>(),
  auth = useAuthStore(),
  notify = useNotificationStore()
const open = ref(false),
  busy = ref(false)
async function remove() {
  busy.value = true
  try {
    await api.delete(`/operations/cancelled/${props.kind}/${props.id}`)
    open.value = false
    notify.push('Dokumen dibatalkan berhasil dihapus.')
    emit('deleted')
  } catch (e) {
    notify.push(getApiErrorMessage(e, 'Dokumen tidak dapat dihapus.'), 'error')
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <span
    v-if="
      status === 'cancelled' &&
      auth.hasPermission(`${kind === 'journals' ? 'accounting' : kind}.delete`)
    "
    class="print:hidden"
  >
    <AppButton variant="danger" @click="open = true">Hapus data dibatalkan</AppButton>
    <AppConfirmDialog
      :open="open"
      title="Hapus dokumen dibatalkan"
      message="Dokumen akan dihapus. Riwayat penghapusan tetap tersimpan pada audit. Dokumen yang masih dirujuk transaksi lain tidak dapat dihapus."
      confirm-label="Hapus"
      :busy="busy"
      @cancel="open = false"
      @confirm="remove"
    />
  </span>
</template>
