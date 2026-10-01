<script setup lang="ts">
import { reactive } from 'vue'
import AppButton from './AppButton.vue'
import { applyInterfacePreferences, loadInterfacePreferences } from '@/utils/interface-preferences'
import { useNotificationStore } from '@/stores/notification.store'
const form = reactive(loadInterfacePreferences()), notify = useNotificationStore()
function save() { applyInterfacePreferences({ ...form }); notify.push('Tampilan antarmuka diperbarui.') }
</script>
<template>
  <section class="panel mb-5 p-5">
    <h2 class="text-lg font-bold">Tampilan &amp; Aksesibilitas</h2>
    <p class="mt-1 text-sm text-slate-500">Sesuaikan kepadatan informasi dan ukuran antarmuka untuk penggunaan harian.</p>
    <div class="mt-5 grid gap-4 md:grid-cols-3">
      <label>Kepadatan tabel<select v-model="form.density" class="field"><option value="comfortable">Nyaman</option><option value="standard">Standar</option><option value="compact">Padat</option></select></label>
      <label>Skala antarmuka<select v-model.number="form.scale" class="field"><option :value="90">90% — lebih ringkas</option><option :value="100">100% — standar</option><option :value="110">110% — lebih besar</option></select></label>
      <label class="flex items-center gap-2 self-end rounded-lg border p-2.5"><input v-model="form.highContrast" type="checkbox" /> Kontras fokus lebih kuat</label>
    </div>
    <AppButton class="mt-4" @click="save">Terapkan tampilan</AppButton>
  </section>
</template>
