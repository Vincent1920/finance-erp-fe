<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '@/services/api/client'
import AppButton from './AppButton.vue'
import { getApiErrorMessage } from '@/utils/error'

const props = defineProps<{ screenKey: string; filters: Record<string, unknown> }>()
const emit = defineEmits<{ apply: [filters: Record<string, unknown>] }>()
type View = { id: number; name: string; filters: Record<string, unknown>; is_default: boolean }
const views = ref<View[]>([]), selected = ref<number | null>(null), busy = ref(false), error = ref('')

async function load() {
  try {
    views.value = (await api.get('/operations/saved-views', { params: { screen_key: props.screenKey } })).data.data
    const initial = views.value.find((view) => view.is_default)
    if (initial) { selected.value = initial.id; emit('apply', initial.filters) }
  } catch (e) { error.value = getApiErrorMessage(e, 'Filter tersimpan gagal dimuat.') }
}
function apply() {
  const view = views.value.find((item) => item.id === selected.value)
  if (view) emit('apply', view.filters)
}
async function save() {
  const name = window.prompt('Nama filter:')?.trim()
  if (!name) return
  busy.value = true
  try {
    await api.put('/operations/saved-views', { screen_key: props.screenKey, name, filters: props.filters, is_default: window.confirm('Jadikan filter bawaan saat halaman dibuka?') })
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Filter gagal disimpan.') } finally { busy.value = false }
}
async function remove() {
  if (!selected.value || !window.confirm('Hapus filter tersimpan ini?')) return
  busy.value = true
  try { await api.delete(`/operations/saved-views/${selected.value}`); selected.value = null; await load() }
  catch (e) { error.value = getApiErrorMessage(e, 'Filter gagal dihapus.') } finally { busy.value = false }
}
onMounted(load)
</script>
<template>
  <div class="flex flex-wrap items-end gap-2 text-sm">
    <label>Filter tersimpan<select v-model="selected" class="field mt-1" @change="apply"><option :value="null">Pilih filter</option><option v-for="view in views" :key="view.id" :value="view.id">{{ view.name }}{{ view.is_default ? ' (bawaan)' : '' }}</option></select></label>
    <AppButton type="button" variant="secondary" :disabled="busy" @click="save">Simpan filter</AppButton>
    <AppButton v-if="selected" type="button" variant="secondary" :disabled="busy" @click="remove">Hapus</AppButton>
    <span v-if="error" class="text-red-600">{{ error }}</span>
  </div>
</template>
