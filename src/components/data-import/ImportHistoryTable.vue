<script setup lang="ts">
import { Download, RefreshCw } from 'lucide-vue-next'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import type { ImportJob, ImportJobStatus, ImportTypeConfig } from '@/types/data-import'

withDefaults(
  defineProps<{
    jobs: ImportJob[]
    configs: ImportTypeConfig[]
    loading: boolean
    errorMessage?: string
    downloadingId?: string
    page: number
    total: number
    perPage: number
  }>(),
  { errorMessage: '', downloadingId: '' },
)

const emit = defineEmits<{
  changePage: [page: number]
  refresh: []
  downloadErrors: [job: ImportJob]
}>()

const statusLabels: Record<ImportJobStatus, string> = {
  queued: 'Dalam antrean',
  processing: 'Memvalidasi',
  validated: 'Tervalidasi',
  awaiting_confirmation: 'Menunggu konfirmasi',
  ready: 'Siap di-import',
  importing: 'Mengimpor',
  completed: 'Selesai',
  completed_with_errors: 'Selesai dengan error',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
}

const statusTone = (status: ImportJobStatus) => {
  if (status === 'completed') return 'green'
  if (status === 'failed' || status === 'cancelled') return 'red'
  if (status === 'completed_with_errors' || status === 'awaiting_confirmation') return 'amber'
  if (status === 'processing' || status === 'importing' || status === 'queued') return 'blue'
  return 'slate'
}

const typeLabel = (job: ImportJob, configs: ImportTypeConfig[]) =>
  configs.find((config) => config.type === job.importType)?.label ?? job.importType

const formatDateTime = (value: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
</script>

<template>
  <section class="panel overflow-hidden">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <div>
        <h2 class="font-semibold">Riwayat import</h2>
        <p class="mt-0.5 text-xs text-slate-500">
          Jejak file, hasil import, dan laporan error sebelumnya.
        </p>
      </div>
      <AppButton variant="secondary" :icon="RefreshCw" :loading="loading" @click="emit('refresh')">
        Muat ulang
      </AppButton>
    </header>

    <div
      v-if="errorMessage"
      class="m-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[980px] text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Nomor / File</th>
            <th class="px-4 py-3">Tipe</th>
            <th class="px-4 py-3">Diunggah</th>
            <th class="px-4 py-3 text-right">Baris</th>
            <th class="px-4 py-3 text-right">Berhasil</th>
            <th class="px-4 py-3 text-right">Gagal</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3 text-right">Laporan</th>
          </tr>
        </thead>
        <tbody v-if="loading" class="divide-y">
          <tr v-for="index in 4" :key="index">
            <td colspan="8" class="px-4 py-4">
              <div class="h-5 animate-pulse rounded bg-slate-100" />
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="jobs.length" class="divide-y">
          <tr v-for="job in jobs" :key="job.id" class="hover:bg-slate-50/70">
            <td class="px-4 py-3">
              <b class="block font-mono text-xs text-blue-700">{{ job.importNumber }}</b>
              <span class="mt-1 block max-w-64 truncate text-slate-600" :title="job.fileName">
                {{ job.fileName }}
              </span>
            </td>
            <td class="px-4 py-3">{{ typeLabel(job, configs) }}</td>
            <td class="px-4 py-3 text-xs text-slate-500">
              {{ formatDateTime(job.uploadedAt) }}
              <span v-if="job.uploadedBy" class="mt-1 block">oleh {{ job.uploadedBy }}</span>
            </td>
            <td class="px-4 py-3 text-right tabular-nums">
              {{ job.totalRows.toLocaleString('id-ID') }}
            </td>
            <td class="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
              {{ job.importedRows.toLocaleString('id-ID') }}
            </td>
            <td class="px-4 py-3 text-right font-semibold tabular-nums text-red-600">
              {{ job.failedRows.toLocaleString('id-ID') }}
            </td>
            <td class="px-4 py-3">
              <AppBadge :tone="statusTone(job.status)">{{ statusLabels[job.status] }}</AppBadge>
              <p v-if="job.errorMessage" class="mt-1 max-w-52 text-xs text-red-600">
                {{ job.errorMessage }}
              </p>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="job.errorRows > 0 || job.failedRows > 0"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                :disabled="downloadingId === String(job.id)"
                @click="emit('downloadErrors', job)"
              >
                <span
                  v-if="downloadingId === String(job.id)"
                  class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                <Download v-else class="h-3.5 w-3.5" />
                Error CSV
              </button>
              <span v-else class="text-slate-300">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppEmptyState
      v-if="!loading && !jobs.length && !errorMessage"
      title="Belum ada riwayat import"
      description="Import yang divalidasi akan muncul di tabel ini."
    />

    <div class="border-t p-4">
      <AppPagination
        :page="page"
        :total="total"
        :per-page="perPage"
        @change="emit('changePage', $event)"
      />
    </div>
  </section>
</template>
