<script setup lang="ts">
import PrintTemplateSettings from '@/components/common/PrintTemplateSettings.vue'
import CompanyIdentitySettings from '@/components/common/CompanyIdentitySettings.vue'
import InterfacePreferences from '@/components/common/InterfacePreferences.vue'
import { computed, onMounted, ref } from 'vue'
import { Save } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { settingsService } from '@/services/settings.service'
import { useNotificationStore } from '@/stores/notification.store'
import { getApiErrorMessage } from '@/utils/error'
import api from '@/services/api/client'
import { useAuthStore } from '@/stores/auth.store'

type Setting = Awaited<ReturnType<typeof settingsService.list>>[number]
const rows = ref<Setting[]>([]),
  backups = ref<Array<Record<string, any>>>([]),
  activeCategory = ref(''),
  loading = ref(false),
  saving = ref(false),
  error = ref('')
const notifications = useNotificationStore()
const auth = useAuthStore()
const editableRows = computed(() =>
  rows.value.filter((row) => !row.setting_key.startsWith('document.print_template')),
)
const categories = computed(() => [...new Set(editableRows.value.map((row) => row.category))])
const visibleRows = computed(() =>
  editableRows.value.filter((row) => row.category === activeCategory.value),
)
const label = (key: string) =>
  key.replaceAll(/[._-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await settingsService.list()
    if (auth.hasPermission('backups.view')) backups.value = (await api.get('/operations/backups')).data.data
    activeCategory.value ||= categories.value[0] ?? ''
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pengaturan gagal dimuat.')
  } finally {
    loading.value = false
  }
}
async function createBackup() {
  saving.value = true
  try { await api.post('/operations/backups', { type: 'full' }); notifications.push('Backup database selesai dibuat.'); await load() }
  catch (e) { notifications.push(getApiErrorMessage(e, 'Backup database gagal.'), 'error') } finally { saving.value = false }
}
async function downloadBackup(row: Record<string, any>) {
  const response = await api.get(`/operations/backups/${row.id}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data), link = document.createElement('a')
  link.href = url; link.download = String(row.file_name); link.click(); URL.revokeObjectURL(url)
}
async function restoreBackup(row: Record<string, any>) {
  const confirmation = window.prompt(`Pemulihan akan mengganti database aktif. Ketik RESTORE ${row.backup_number}:`)
  if (!confirmation) return
  saving.value = true
  try { await api.post('/operations/backups/restore', { backup_id: row.id, confirmation }); notifications.push('Database berhasil dipulihkan. Silakan masuk kembali.'); await load() }
  catch (e) { notifications.push(getApiErrorMessage(e, 'Pemulihan database gagal.'), 'error') } finally { saving.value = false }
}
async function save() {
  saving.value = true
  try {
    await settingsService.updateAll(
      visibleRows.value.map((row) => ({
        key: row.setting_key,
        value: row.setting_value,
        value_type: row.value_type,
        category: row.category,
        is_secret: Boolean(row.is_secret),
      })),
    )
    notifications.push('Pengaturan berhasil disimpan.')
    await load()
  } catch (e) {
    notifications.push(getApiErrorMessage(e, 'Pengaturan gagal disimpan.'), 'error')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Pengaturan</h1>
      <p class="mt-1 text-sm text-slate-500">
        Konfigurasi yang tersimpan pada database perusahaan.
      </p>
    </div>
    <CompanyIdentitySettings />
    <InterfacePreferences />
    <PrintTemplateSettings />
    <section v-if="auth.hasPermission('backups.view')" class="panel mb-5 p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-bold">Backup &amp; Pemulihan</h2><p class="text-sm text-slate-500">Backup menyimpan struktur dan seluruh data dengan checksum SHA-256.</p></div><AppButton v-if="auth.hasPermission('backups.create')" :loading="saving" @click="createBackup">Buat backup penuh</AppButton></div>
      <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th class="p-2">Nomor</th><th class="p-2">Dibuat</th><th class="p-2">Status</th><th class="p-2">Ukuran</th><th class="p-2">Aksi</th></tr></thead><tbody><tr v-for="backup in backups" :key="backup.id" class="border-t"><td class="p-2">{{ backup.backup_number }}</td><td class="p-2">{{ String(backup.created_at).slice(0, 19).replace('T', ' ') }}</td><td class="p-2">{{ backup.status }}</td><td class="p-2">{{ backup.file_size ? `${(Number(backup.file_size) / 1024 / 1024).toFixed(2)} MB` : '—' }}</td><td class="p-2"><AppButton v-if="backup.status === 'completed'" variant="secondary" @click="downloadBackup(backup)">Unduh</AppButton><AppButton v-if="backup.status === 'completed' && auth.hasPermission('backups.restore')" class="ml-2" variant="secondary" :disabled="saving" @click="restoreBackup(backup)">Pulihkan</AppButton></td></tr><tr v-if="!backups.length"><td colspan="5" class="p-4 text-slate-500">Belum ada backup.</td></tr></tbody></table></div>
    </section>
    <section class="panel overflow-hidden">
      <div class="flex flex-wrap gap-2 border-b p-4">
        <button
          v-for="category in categories"
          :key="category"
          class="rounded-lg px-4 py-2 text-sm font-semibold capitalize"
          :class="
            activeCategory === category ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
          "
          @click="activeCategory = category"
        >
          {{ category }}
        </button>
      </div>
      <div class="space-y-5 p-5">
        <div v-if="error" class="rounded bg-red-50 p-4 text-red-700">{{ error }}</div>
        <div v-for="row in visibleRows" :key="row.setting_key">
          <label class="mb-1 block text-sm font-semibold">{{ label(row.setting_key) }}</label>
          <input
            v-if="row.value_type === 'number' || row.value_type === 'account_id'"
            v-model.number="row.setting_value"
            type="number"
            min="1"
            class="field max-w-xl"
          />
          <label v-else-if="row.value_type === 'boolean'" class="flex items-center gap-2">
            <input v-model="row.setting_value" type="checkbox" />
            Aktif
          </label>
          <textarea
            v-else-if="row.value_type === 'json'"
            :value="JSON.stringify(row.setting_value, null, 2)"
            class="field min-h-32 max-w-xl font-mono"
            readonly
          />
          <input
            v-else
            v-model="row.setting_value"
            :type="row.is_secret ? 'password' : 'text'"
            class="field max-w-xl"
          />
          <p class="mt-1 text-xs text-slate-400">
            Key: {{ row.setting_key }} · Type: {{ row.value_type }}
          </p>
        </div>
        <p v-if="!loading && !rows.length" class="py-8 text-center text-sm text-slate-400">
          Belum ada pengaturan yang dikonfigurasi.
        </p>
        <AppButton
          :icon="Save"
          :loading="saving"
          :disabled="loading || !visibleRows.length"
          @click="save"
        >
          Simpan Perubahan
        </AppButton>
      </div>
    </section>
  </div>
</template>
