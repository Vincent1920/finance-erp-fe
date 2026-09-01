<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { auditService } from '@/services/audit.service'
import { errorLogService } from '@/services/error-log.service'
import { getApiErrorMessage } from '@/utils/error'
const route = useRoute(),
  type = computed(() => String(route.meta.logType)),
  title = computed(() => String(route.meta.title))
const rows = ref<Record<string, unknown>[]>([]),
  detail = ref<Record<string, unknown> | null>(null),
  search = ref(''),
  dateFrom = ref(''),
  dateTo = ref(''),
  level = ref(''),
  loading = ref(false),
  error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      search: search.value || undefined,
      date_from: dateFrom.value || undefined,
      date_to: dateTo.value || undefined,
      level: level.value || undefined,
    }
    const result =
      type.value === 'audit' ? await auditService.list(params) : await errorLogService.list(params)
    rows.value = result.data as unknown as Record<string, unknown>[]
  } catch (e) {
    rows.value = []
    error.value = getApiErrorMessage(e, 'Log gagal dimuat.')
  } finally {
    loading.value = false
  }
}
async function open(row: Record<string, unknown>) {
  detail.value = (type.value === 'audit'
    ? await auditService.get(Number(row.id))
    : await errorLogService.get(Number(row.id))) as unknown as Record<string, unknown>
}
watch(type, load)
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ title }}</h1>
      <p class="mt-1 text-sm text-slate-500">
        Catatan sistem bersifat read-only dan berasal dari database.
      </p>
    </div>
    <section class="panel overflow-hidden">
      <div class="flex flex-wrap gap-3 border-b p-4">
        <input v-model="dateFrom" type="date" class="field w-auto" />
        <input v-model="dateTo" type="date" class="field w-auto" />
        <select v-if="type === 'error'" v-model="level" class="field w-auto">
          <option value="">Semua level</option>
          <option>error</option>
          <option>warn</option>
          <option>info</option>
        </select>
        <input
          v-model="search"
          class="field min-w-56 flex-1"
          placeholder="Cari log..."
          @keyup.enter="load"
        />
        <AppButton :icon="Search" :loading="loading" @click="load">Muat</AppButton>
      </div>
      <div v-if="error" class="m-4 rounded bg-red-50 p-4 text-red-700">{{ error }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3">Waktu</th>
              <th class="px-4 py-3">Level/Action</th>
              <th class="px-4 py-3">Module</th>
              <th class="px-4 py-3">Message/Entity</th>
              <th class="px-4 py-3">Request ID</th>
              <th class="px-4 py-3">User</th>
              <th class="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="row in rows" :key="String(row.id)">
              <td class="px-4 py-3">
                {{ new Date(String(row.created_at)).toLocaleString('id-ID') }}
              </td>
              <td class="px-4 py-3 font-semibold">{{ row.level ?? row.action }}</td>
              <td class="px-4 py-3">{{ row.category ?? row.module }}</td>
              <td class="max-w-md truncate px-4 py-3">
                {{
                  row.message ??
                  `${row.record_type ?? ''} ${row.record_number ?? row.record_id ?? ''}`
                }}
              </td>
              <td class="px-4 py-3 font-mono text-xs">{{ row.request_id ?? '-' }}</td>
              <td class="px-4 py-3">{{ row.user_name ?? '-' }}</td>
              <td class="px-4 py-3">
                <button class="font-semibold text-blue-600" @click="open(row)">Detail</button>
              </td>
            </tr>
            <tr v-if="!loading && !rows.length">
              <td colspan="7" class="py-12 text-center text-slate-400">Tidak ada log.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div
      v-if="detail"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
    >
      <section class="panel max-h-[85vh] w-full max-w-3xl overflow-auto p-5">
        <div class="mb-4 flex justify-between">
          <h2 class="text-lg font-bold">Detail {{ title }}</h2>
          <button @click="detail = null"><X /></button>
        </div>
        <pre class="whitespace-pre-wrap rounded bg-slate-950 p-4 text-xs text-slate-100">{{
          JSON.stringify(detail, null, 2)
        }}</pre>
      </section>
    </div>
  </div>
</template>
