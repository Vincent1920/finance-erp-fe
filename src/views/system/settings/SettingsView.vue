<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Save } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { settingsService } from '@/services/settings.service'
import { useNotificationStore } from '@/stores/notification.store'
import { getApiErrorMessage } from '@/utils/error'

type Setting = Awaited<ReturnType<typeof settingsService.list>>[number]
const rows = ref<Setting[]>([]),
  activeCategory = ref(''),
  loading = ref(false),
  saving = ref(false),
  error = ref('')
const notifications = useNotificationStore()
const categories = computed(() => [...new Set(rows.value.map((row) => row.category))])
const visibleRows = computed(() =>
  rows.value.filter((row) => row.category === activeCategory.value),
)
const label = (key: string) =>
  key.replaceAll(/[._-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await settingsService.list()
    activeCategory.value ||= categories.value[0] ?? ''
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pengaturan gagal dimuat.')
  } finally {
    loading.value = false
  }
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
