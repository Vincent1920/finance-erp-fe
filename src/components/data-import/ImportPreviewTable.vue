<script setup lang="ts">
import AppBadge from '@/components/common/AppBadge.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import type { ImportIssue, ImportPreviewRow, ImportRowStatus } from '@/types/data-import'

withDefaults(
  defineProps<{
    rows: ImportPreviewRow[]
    loading: boolean
    errorMessage?: string
    page: number
    total: number
    perPage: number
    statusFilter?: string
  }>(),
  { errorMessage: '', statusFilter: '' },
)

const emit = defineEmits<{
  changePage: [page: number]
  changeFilter: [status: string]
}>()

const statusLabel = (row: ImportPreviewRow) => {
  if (row.isDuplicate) return 'Duplikat'
  const labels: Record<ImportRowStatus, string> = {
    valid: 'Valid',
    warning: 'Peringatan',
    error: 'Error',
    duplicate: 'Duplikat',
  }
  return labels[row.status]
}

const statusTone = (row: ImportPreviewRow) => {
  if (row.status === 'error') return 'red'
  if (row.status === 'warning' || row.status === 'duplicate' || row.isDuplicate) return 'amber'
  return 'green'
}

const formatIssueValue = (issue: ImportIssue) => {
  if (issue.value === null || issue.value === undefined || issue.value === '') return '(kosong)'
  const value =
    typeof issue.value === 'object' ? JSON.stringify(issue.value) : String(issue.value)
  return value.length > 80 ? `${value.slice(0, 77)}...` : value
}
</script>

<template>
  <section class="panel overflow-hidden">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <div>
        <h2 class="font-semibold">Preview & hasil validasi</h2>
        <p class="mt-0.5 text-xs text-slate-500">
          Periksa baris bermasalah sebelum mengonfirmasi import.
        </p>
      </div>
      <select
        :value="statusFilter"
        class="field w-full sm:w-48"
        aria-label="Filter status validasi"
        @change="emit('changeFilter', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua status</option>
        <option value="valid">Valid</option>
        <option value="warning">Peringatan</option>
        <option value="error">Error</option>
        <option value="duplicate">Duplikat</option>
      </select>
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
            <th class="w-20 px-4 py-3">Baris</th>
            <th class="w-32 px-4 py-3">Status</th>
            <th class="w-44 px-4 py-3">Referensi</th>
            <th class="px-4 py-3">Deskripsi</th>
            <th class="min-w-80 px-4 py-3">Detail validasi</th>
          </tr>
        </thead>
        <tbody v-if="loading" class="divide-y">
          <tr v-for="index in 5" :key="index">
            <td colspan="5" class="px-4 py-4">
              <div class="h-5 animate-pulse rounded bg-slate-100" />
            </td>
          </tr>
        </tbody>
        <tbody v-else-if="rows.length" class="divide-y align-top">
          <tr v-for="row in rows" :key="row.id" class="hover:bg-slate-50/70">
            <td class="px-4 py-3 font-mono font-semibold text-slate-600">
              {{ row.rowNumber }}
            </td>
            <td class="px-4 py-3">
              <AppBadge :tone="statusTone(row)">{{ statusLabel(row) }}</AppBadge>
            </td>
            <td class="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
              {{ row.reference || '—' }}
            </td>
            <td class="max-w-64 px-4 py-3 text-slate-600">
              <span class="line-clamp-2">{{ row.description || '—' }}</span>
            </td>
            <td class="px-4 py-3">
              <ul v-if="row.issues.length" class="space-y-2">
                <li
                  v-for="(issue, issueIndex) in row.issues"
                  :key="`${issue.field}-${issue.code}-${issueIndex}`"
                  class="rounded-lg border px-3 py-2 text-xs"
                  :class="
                    issue.severity === 'error'
                      ? 'border-red-100 bg-red-50 text-red-700'
                      : 'border-amber-100 bg-amber-50 text-amber-800'
                  "
                >
                  <div class="flex flex-wrap items-baseline gap-x-1">
                    <b class="font-mono">{{ issue.field }}</b>
                    <span class="text-slate-400">=</span>
                    <code class="break-all">{{ formatIssueValue(issue) }}</code>
                  </div>
                  <p class="mt-1 leading-5">{{ issue.message }}</p>
                </li>
              </ul>
              <span v-else-if="row.isDuplicate" class="text-xs text-amber-700">
                Referensi sudah ada dan akan dilewati dengan aman.
              </span>
              <span v-else class="text-xs font-medium text-emerald-600">Siap di-import</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppEmptyState
      v-if="!loading && !rows.length && !errorMessage"
      title="Tidak ada baris untuk filter ini"
      description="Ubah filter status untuk melihat hasil validasi lainnya."
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
