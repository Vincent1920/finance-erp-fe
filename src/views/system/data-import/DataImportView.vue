<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-vue-next'
import AppButton from '@/components/common/AppButton.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import ImportHistoryTable from '@/components/data-import/ImportHistoryTable.vue'
import ImportPreviewTable from '@/components/data-import/ImportPreviewTable.vue'
import ImportSummaryCards from '@/components/data-import/ImportSummaryCards.vue'
import { getImportTypeDefinition } from '@/data/import-types'
import { dataImportService } from '@/services/data-import.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import type {
  ImportAs,
  ImportErrorPolicy,
  ImportFileFormat,
  ImportJob,
  ImportPreviewRow,
  ImportType,
  ImportTypeConfig,
} from '@/types/data-import'
import { getApiErrorMessage } from '@/utils/error'

const PREVIEW_PAGE_SIZE = 20
const HISTORY_PAGE_SIZE = 10
const PROCESSING_STATUSES = new Set(['queued', 'processing', 'importing'])
const TERMINAL_STATUSES = new Set(['completed', 'completed_with_errors', 'failed', 'cancelled'])

const auth = useAuthStore()
const notifications = useNotificationStore()

const configs = ref<ImportTypeConfig[]>([])
const importType = ref<ImportType | ''>('')
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const fileError = ref('')
const isDragging = ref(false)
const isLoadingConfig = ref(false)
const configError = ref('')

const templateFormat = ref<ImportFileFormat>('xlsx')
const errorReportFormat = ref<ImportFileFormat>('csv')
const errorPolicy = ref<ImportErrorPolicy>('all_or_nothing')
const importAs = ref<ImportAs>('draft')
const isDownloadingTemplate = ref(false)
const isDownloadingErrors = ref(false)

const currentJob = ref<ImportJob | null>(null)
const previewRows = ref<ImportPreviewRow[]>([])
const previewPage = ref(1)
const previewTotal = ref(0)
const previewStatus = ref('')
const previewError = ref('')
const isPreviewing = ref(false)
const isLoadingRows = ref(false)
const isConfirming = ref(false)
const isCancelling = ref(false)
const showImportConfirmation = ref(false)
const showCancelConfirmation = ref(false)

const history = ref<ImportJob[]>([])
const historyPage = ref(1)
const historyTotal = ref(0)
const historyError = ref('')
const isLoadingHistory = ref(false)
const downloadingHistoryId = ref('')

let pollTimer: ReturnType<typeof setTimeout> | undefined

const visibleConfigs = computed(() =>
  configs.value.filter((config) => auth.hasPermission(config.permission)),
)
const selectedConfig = computed(() =>
  visibleConfigs.value.find((config) => config.type === importType.value),
)
const selectedDefinition = computed(() =>
  importType.value ? getImportTypeDefinition(importType.value) : undefined,
)
const isJobProcessing = computed(() =>
  Boolean(currentJob.value && PROCESSING_STATUSES.has(currentJob.value.status)),
)
const isJobTerminal = computed(() =>
  Boolean(currentJob.value && TERMINAL_STATUSES.has(currentJob.value.status)),
)
const hasBlockingErrors = computed(
  () =>
    Boolean(currentJob.value?.errorRows) && errorPolicy.value === 'all_or_nothing',
)
const canPreview = computed(
  () =>
    Boolean(selectedConfig.value && selectedFile.value && !fileError.value) &&
    !isPreviewing.value &&
    !currentJob.value,
)
const canConfirm = computed(
  () =>
    Boolean(currentJob.value) &&
    !isJobProcessing.value &&
    !isJobTerminal.value &&
    !hasBlockingErrors.value &&
    !isConfirming.value,
)
const importButtonLabel = computed(() => {
  if (!currentJob.value) return 'Import data'
  if (errorPolicy.value === 'valid_only') {
    return `Import ${currentJob.value.validRows.toLocaleString('id-ID')} baris valid`
  }
  return `Import ${currentJob.value.totalRows.toLocaleString('id-ID')} baris`
})
const confirmationMessage = computed(() => {
  if (!currentJob.value || !selectedConfig.value) return ''
  const scope =
    errorPolicy.value === 'valid_only'
      ? `${currentJob.value.validRows.toLocaleString('id-ID')} baris valid akan diproses; baris error dan duplikat akan dilewati.`
      : `${currentJob.value.totalRows.toLocaleString('id-ID')} baris akan diproses dalam satu transaksi. Jika satu baris gagal, seluruh import dibatalkan.`
  const status = selectedConfig.value.supportsImportAs
    ? ` Transaksi dibuat sebagai ${importAs.value === 'draft' ? 'Draft' : 'Submitted'}.`
    : ''
  return `${scope}${status} Lanjutkan import ${selectedConfig.value.label}?`
})

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`
}

const formatJobStatus = (job: ImportJob) => {
  const labels: Record<ImportJob['status'], string> = {
    queued: 'Dalam antrean',
    processing: 'File sedang divalidasi',
    validated: 'Validasi selesai',
    awaiting_confirmation: 'Menunggu konfirmasi',
    ready: 'Siap di-import',
    importing: 'Data sedang di-import',
    completed: 'Import selesai',
    completed_with_errors: 'Selesai dengan error',
    failed: 'Import gagal',
    cancelled: 'Import dibatalkan',
  }
  return labels[job.status]
}

const resetFileInput = () => {
  selectedFile.value = null
  fileError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const validateFile = (file: File) => {
  const config = selectedConfig.value
  if (!config) return 'Pilih tipe import terlebih dahulu.'
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'csv' && extension !== 'xlsx') {
    return 'Format file harus CSV atau XLSX.'
  }
  if (file.size === 0) return 'File kosong tidak dapat diproses.'
  if (file.size > config.maxFileSize) {
    return `Ukuran file melebihi batas ${formatBytes(config.maxFileSize)}.`
  }
  return ''
}

const selectFile = (file?: File) => {
  if (!file || currentJob.value) return
  const validationMessage = validateFile(file)
  fileError.value = validationMessage
  selectedFile.value = validationMessage ? null : file
  if (validationMessage && fileInput.value) fileInput.value.value = ''
}

const handleFileInput = (event: Event) => {
  selectFile((event.target as HTMLInputElement).files?.[0])
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  selectFile(event.dataTransfer?.files?.[0])
}

const loadConfig = async () => {
  isLoadingConfig.value = true
  configError.value = ''
  try {
    configs.value = await dataImportService.config()
    const firstVisible = visibleConfigs.value[0]
    if (!importType.value || !visibleConfigs.value.some((config) => config.type === importType.value)) {
      importType.value = firstVisible?.type ?? ''
    }
    if (!firstVisible) configError.value = 'Akun Anda belum memiliki izin untuk tipe import apa pun.'
  } catch (error) {
    configs.value = []
    importType.value = ''
    configError.value = getApiErrorMessage(error, 'Konfigurasi import gagal dimuat.')
  } finally {
    isLoadingConfig.value = false
  }
}

const loadHistory = async () => {
  isLoadingHistory.value = true
  historyError.value = ''
  try {
    const response = await dataImportService.history({
      page: historyPage.value,
      limit: HISTORY_PAGE_SIZE,
    })
    history.value = response.data
    historyTotal.value = response.meta.total
  } catch (error) {
    history.value = []
    historyTotal.value = 0
    historyError.value = getApiErrorMessage(error, 'Riwayat import gagal dimuat.')
  } finally {
    isLoadingHistory.value = false
  }
}

const loadPreviewRows = async (targetPage = previewPage.value) => {
  if (!currentJob.value) return
  isLoadingRows.value = true
  previewError.value = ''
  try {
    const response = await dataImportService.rows(currentJob.value.id, {
      page: targetPage,
      limit: PREVIEW_PAGE_SIZE,
      status: previewStatus.value || undefined,
    })
    previewRows.value = response.data
    previewPage.value = response.meta.page
    previewTotal.value = response.meta.total
  } catch (error) {
    previewRows.value = []
    previewTotal.value = 0
    previewError.value = getApiErrorMessage(error, 'Baris preview gagal dimuat.')
  } finally {
    isLoadingRows.value = false
  }
}

const clearPolling = () => {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = undefined
}

const pollCurrentJob = async () => {
  clearPolling()
  if (!currentJob.value || !PROCESSING_STATUSES.has(currentJob.value.status)) return
  try {
    currentJob.value = await dataImportService.get(currentJob.value.id)
    if (PROCESSING_STATUSES.has(currentJob.value.status)) {
      pollTimer = setTimeout(pollCurrentJob, 2_000)
      return
    }
    await Promise.all([loadPreviewRows(1), loadHistory()])
    if (currentJob.value.status === 'completed') {
      notifications.push('Import selesai dan seluruh perubahan telah disimpan.')
    } else if (currentJob.value.status === 'completed_with_errors') {
      notifications.push('Import selesai dengan beberapa baris gagal.', 'info')
    } else if (currentJob.value.status === 'failed') {
      notifications.push(currentJob.value.errorMessage ?? 'Import gagal dan telah di-rollback.', 'error')
    }
  } catch (error) {
    previewError.value = getApiErrorMessage(error, 'Status import gagal diperbarui.')
  }
}

const beginPollingIfNeeded = () => {
  clearPolling()
  if (currentJob.value && PROCESSING_STATUSES.has(currentJob.value.status)) {
    pollTimer = setTimeout(pollCurrentJob, 2_000)
  }
}

const createPreview = async () => {
  if (!selectedConfig.value || !selectedFile.value || !canPreview.value) return
  isPreviewing.value = true
  previewError.value = ''
  try {
    const result = await dataImportService.preview(selectedConfig.value.type, selectedFile.value)
    currentJob.value = result.job
    previewRows.value = result.rows
    previewPage.value = result.meta.page
    previewTotal.value = result.meta.total
    errorPolicy.value = selectedConfig.value.defaultErrorPolicy
    notifications.push('File berhasil diunggah dan validasi telah dijalankan.', 'info')
    beginPollingIfNeeded()
    await loadHistory()
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'File gagal diunggah atau divalidasi.'), 'error')
  } finally {
    isPreviewing.value = false
  }
}

const downloadTemplate = async () => {
  if (!selectedConfig.value) return
  isDownloadingTemplate.value = true
  try {
    await dataImportService.downloadTemplate(selectedConfig.value.type, templateFormat.value)
    notifications.push(`Template ${selectedConfig.value.label} berhasil diunduh.`)
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Template gagal diunduh.'), 'error')
  } finally {
    isDownloadingTemplate.value = false
  }
}

const downloadCurrentErrors = async () => {
  if (!currentJob.value) return
  isDownloadingErrors.value = true
  try {
    await dataImportService.downloadErrors(
      currentJob.value.id,
      currentJob.value.importNumber,
      errorReportFormat.value,
    )
    notifications.push('Laporan validasi berhasil diunduh.')
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Laporan error gagal diunduh.'), 'error')
  } finally {
    isDownloadingErrors.value = false
  }
}

const downloadHistoryErrors = async (job: ImportJob) => {
  downloadingHistoryId.value = String(job.id)
  try {
    await dataImportService.downloadErrors(job.id, job.importNumber, 'csv')
    notifications.push(`Laporan ${job.importNumber} berhasil diunduh.`)
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Laporan error gagal diunduh.'), 'error')
  } finally {
    downloadingHistoryId.value = ''
  }
}

const confirmImport = async () => {
  if (!currentJob.value || !canConfirm.value) return
  isConfirming.value = true
  try {
    currentJob.value = await dataImportService.confirm(currentJob.value.id, {
      errorPolicy: errorPolicy.value,
      importAs: importAs.value,
      skipDuplicates: true,
    })
    showImportConfirmation.value = false
    if (currentJob.value.status === 'completed') {
      notifications.push('Import selesai dan seluruh perubahan telah disimpan.')
    } else if (currentJob.value.status === 'completed_with_errors') {
      notifications.push('Import selesai dengan beberapa baris dilewati.', 'info')
    } else {
      notifications.push('Import dimulai. Status akan diperbarui otomatis.', 'info')
    }
    beginPollingIfNeeded()
    await loadHistory()
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Import gagal dikonfirmasi.'), 'error')
  } finally {
    isConfirming.value = false
  }
}

const resetCurrentImport = () => {
  clearPolling()
  currentJob.value = null
  previewRows.value = []
  previewPage.value = 1
  previewTotal.value = 0
  previewStatus.value = ''
  previewError.value = ''
  showImportConfirmation.value = false
  showCancelConfirmation.value = false
  resetFileInput()
}

const cancelImport = async () => {
  if (!currentJob.value) return
  isCancelling.value = true
  try {
    await dataImportService.cancel(currentJob.value.id)
    notifications.push('Import dibatalkan. Tidak ada data yang disimpan.', 'info')
    resetCurrentImport()
    await loadHistory()
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Import tidak dapat dibatalkan.'), 'error')
  } finally {
    isCancelling.value = false
  }
}

const startAnotherImport = () => {
  resetCurrentImport()
  errorPolicy.value = selectedConfig.value?.defaultErrorPolicy ?? 'all_or_nothing'
  importAs.value = 'draft'
}

watch(importType, () => {
  if (currentJob.value) return
  resetFileInput()
  errorPolicy.value = selectedConfig.value?.defaultErrorPolicy ?? 'all_or_nothing'
  importAs.value = 'draft'
})

onMounted(() => Promise.all([loadConfig(), loadHistory()]))
onBeforeUnmount(clearPolling)
</script>

<template>
  <div>
    <AppBreadcrumb />

    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <ShieldCheck class="h-3.5 w-3.5" />
          Validasi sebelum masuk database
        </div>
        <h1 class="text-2xl font-bold">Data Import</h1>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">
          Upload CSV atau Excel, tinjau hasil validasi, lalu konfirmasi data yang aman untuk diproses.
        </p>
      </div>
      <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
        <span class="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <Check class="h-4 w-4" />
        </span>
        Tidak ada import otomatis
      </div>
    </div>

    <div class="mb-5 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        v-for="(step, index) in ['Upload', 'Validasi', 'Konfirmasi', 'Selesai']"
        :key="step"
        class="relative flex items-center justify-center gap-2 border-r px-2 py-3 text-xs font-semibold last:border-r-0 sm:text-sm"
        :class="{
          'bg-blue-50 text-blue-700':
            (index === 0 && !currentJob) ||
            (index === 1 && currentJob && isJobProcessing) ||
            (index === 2 && currentJob && !isJobProcessing && !isJobTerminal) ||
            (index === 3 && currentJob && isJobTerminal),
          'text-emerald-700':
            (index === 0 && currentJob) ||
            (index === 1 && currentJob && !isJobProcessing) ||
            (index === 2 && currentJob && isJobTerminal),
          'text-slate-400': !currentJob && index > 0,
        }"
      >
        <span
          class="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px]"
          :class="
            (index === 0 && currentJob) ||
            (index === 1 && currentJob && !isJobProcessing) ||
            (index === 2 && currentJob && isJobTerminal)
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-current'
          "
        >
          <Check
            v-if="
              (index === 0 && currentJob) ||
              (index === 1 && currentJob && !isJobProcessing) ||
              (index === 2 && currentJob && isJobTerminal)
            "
            class="h-3.5 w-3.5"
          />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="hidden sm:inline">{{ step }}</span>
      </div>
    </div>

    <section class="panel mb-5 overflow-hidden">
      <header class="flex items-center gap-3 border-b p-5">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
          <UploadCloud class="h-5 w-5" />
        </span>
        <div>
          <h2 class="font-semibold">Pilih sumber data</h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Gunakan template agar nama dan urutan kolom sesuai.
          </p>
        </div>
      </header>

      <div class="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div class="space-y-5">
          <div
            v-if="configError"
            class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{{ configError }}</span>
            <AppButton variant="secondary" :loading="isLoadingConfig" @click="loadConfig">
              Coba lagi
            </AppButton>
          </div>

          <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <label class="block text-sm">
              <span class="mb-1.5 block font-medium text-slate-700">
                Tipe import <b class="text-red-500">*</b>
              </span>
              <select
                v-model="importType"
                class="field"
                :disabled="isLoadingConfig || Boolean(currentJob)"
              >
                <option value="">Pilih tipe data...</option>
                <option v-for="config in visibleConfigs" :key="config.type" :value="config.type">
                  {{ config.label }}
                </option>
              </select>
              <span v-if="selectedDefinition" class="mt-1.5 block text-xs text-slate-500">
                {{ selectedDefinition.description }}
              </span>
            </label>

            <div>
              <span class="mb-1.5 block text-sm font-medium text-slate-700">Template</span>
              <div class="flex gap-2">
                <select
                  v-model="templateFormat"
                  class="field w-24"
                  :disabled="!selectedConfig || isDownloadingTemplate"
                  aria-label="Format template"
                >
                  <option value="xlsx">XLSX</option>
                  <option value="csv">CSV</option>
                </select>
                <AppButton
                  variant="secondary"
                  :icon="Download"
                  :loading="isDownloadingTemplate"
                  :disabled="!selectedConfig"
                  @click="downloadTemplate"
                >
                  Download
                </AppButton>
              </div>
            </div>
          </div>

          <label
            class="relative block cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition"
            :class="[
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50',
              (!selectedConfig || currentJob) && 'cursor-not-allowed opacity-60',
              fileError && 'border-red-300 bg-red-50',
            ]"
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <input
              ref="fileInput"
              type="file"
              class="sr-only"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              :disabled="!selectedConfig || Boolean(currentJob)"
              @change="handleFileInput"
            />

            <template v-if="selectedFile">
              <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <FileCheck2 class="h-6 w-6" />
              </span>
              <p class="mt-3 font-semibold text-slate-800">{{ selectedFile.name }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ formatBytes(selectedFile.size) }}</p>
              <button
                v-if="!currentJob"
                type="button"
                class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                @click.prevent="resetFileInput"
              >
                <X class="h-3.5 w-3.5" /> Ganti file
              </button>
            </template>
            <template v-else>
              <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                <FileSpreadsheet class="h-6 w-6" />
              </span>
              <p class="mt-3 font-semibold text-slate-700">Tarik file ke sini atau klik untuk memilih</p>
              <p class="mt-1 text-xs text-slate-500">
                CSV atau XLSX<span v-if="selectedConfig"> · Maks. {{ formatBytes(selectedConfig.maxFileSize) }}</span>
              </p>
            </template>
          </label>
          <p v-if="fileError" class="text-sm font-medium text-red-600">{{ fileError }}</p>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs leading-5 text-slate-500">
              File hanya di-upload untuk validasi. Data belum disimpan sampai Anda menekan tombol konfirmasi import.
            </p>
            <AppButton
              :icon="UploadCloud"
              :loading="isPreviewing"
              :disabled="!canPreview"
              @click="createPreview"
            >
              Upload & validasi
            </AppButton>
          </div>
        </div>

        <aside class="rounded-2xl bg-slate-50 p-4">
          <h3 class="text-sm font-semibold text-slate-800">Ketentuan file</h3>
          <dl class="mt-4 space-y-3 text-xs">
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Format</dt>
              <dd class="font-semibold">CSV, XLSX</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Ukuran maksimum</dt>
              <dd class="font-semibold">{{ selectedConfig ? formatBytes(selectedConfig.maxFileSize) : '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Baris maksimum</dt>
              <dd class="font-semibold">{{ selectedConfig?.maxRows.toLocaleString('id-ID') ?? '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Duplikat</dt>
              <dd class="font-semibold text-emerald-700">Selalu dilewati</dd>
            </div>
          </dl>

          <div v-if="selectedConfig" class="mt-5 border-t border-slate-200 pt-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Kolom wajib</p>
            <div class="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              <code
                v-for="column in selectedConfig.requiredColumns"
                :key="column"
                class="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
              >
                {{ column }}
              </code>
              <span v-if="!selectedConfig.requiredColumns.length" class="text-xs text-slate-400">
                Ikuti kolom pada template.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <template v-if="currentJob">
      <section class="panel mb-5 p-5">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-semibold">Ringkasan validasi</h2>
              <span class="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">
                {{ currentJob.importNumber }}
              </span>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              {{ currentJob.fileName }} · {{ formatJobStatus(currentJob) }}
            </p>
          </div>
          <span
            v-if="isJobProcessing"
            class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
          >
            <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Memproses di server
          </span>
          <span
            v-else-if="currentJob.status === 'completed'"
            class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
          >
            <CheckCircle2 class="h-4 w-4" /> Selesai
          </span>
        </div>

        <ImportSummaryCards :job="currentJob" />

        <div
          v-if="currentJob.errorMessage"
          class="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ currentJob.errorMessage }}
        </div>
      </section>

      <section v-if="!isJobTerminal" class="panel mb-5 overflow-hidden">
        <header class="border-b p-5">
          <h2 class="font-semibold">Aturan import</h2>
          <p class="mt-0.5 text-xs text-slate-500">
            Tentukan perlakuan error sebelum data diproses oleh service bisnis.
          </p>
        </header>
        <div class="grid gap-5 p-5 lg:grid-cols-2">
          <div>
            <p class="mb-2 text-sm font-medium text-slate-700">Jika terdapat error</p>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label
                class="cursor-pointer rounded-xl border p-4 transition"
                :class="errorPolicy === 'all_or_nothing' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'"
              >
                <div class="flex items-start gap-3">
                  <input
                    v-model="errorPolicy"
                    type="radio"
                    value="all_or_nothing"
                    class="mt-0.5 h-4 w-4 border-slate-300 text-blue-600"
                    :disabled="isJobProcessing"
                  />
                  <span>
                    <b class="block text-sm">Batalkan seluruh import</b>
                    <small class="mt-1 block leading-5 text-slate-500">Rollback semua perubahan jika satu data kritis gagal.</small>
                  </span>
                </div>
              </label>
              <label
                class="cursor-pointer rounded-xl border p-4 transition"
                :class="errorPolicy === 'valid_only' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'"
              >
                <div class="flex items-start gap-3">
                  <input
                    v-model="errorPolicy"
                    type="radio"
                    value="valid_only"
                    class="mt-0.5 h-4 w-4 border-slate-300 text-blue-600"
                    :disabled="isJobProcessing"
                  />
                  <span>
                    <b class="block text-sm">Import data valid saja</b>
                    <small class="mt-1 block leading-5 text-slate-500">Error dan duplikat dilewati serta dicatat di laporan.</small>
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div class="space-y-4">
            <label v-if="selectedConfig?.supportsImportAs" class="block text-sm">
              <span class="mb-1.5 block font-medium text-slate-700">Import sebagai</span>
              <select v-model="importAs" class="field" :disabled="isJobProcessing">
                <option value="draft">Draft — dapat diperiksa dan diedit</option>
                <option value="submitted">Submitted — siap untuk proses berikutnya</option>
              </select>
              <span class="mt-1.5 block text-xs text-slate-500">
                Import tidak pernah membuat transaksi Posted secara otomatis.
              </span>
            </label>

            <div class="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <b class="block text-sm text-emerald-800">Skip duplicate aktif</b>
                <p class="mt-1 text-xs leading-5 text-emerald-700">
                  Transaksi yang sudah ada tidak akan ditimpa atau dibuat ulang.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="hasBlockingErrors"
          class="mx-5 mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Terdapat {{ currentJob.errorRows.toLocaleString('id-ID') }} baris error. Perbaiki file dan upload ulang,
            atau pilih <b>Import data valid saja</b> jika kebijakan perusahaan mengizinkan.
          </p>
        </div>
      </section>

      <ImportPreviewTable
        class="mb-5"
        :rows="previewRows"
        :loading="isLoadingRows || isJobProcessing"
        :error-message="previewError"
        :page="previewPage"
        :total="previewTotal"
        :per-page="PREVIEW_PAGE_SIZE"
        :status-filter="previewStatus"
        @change-page="previewPage = $event; loadPreviewRows()"
        @change-filter="previewStatus = $event; previewPage = 1; loadPreviewRows(1)"
      />

      <section class="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p class="text-sm font-semibold">Tindakan import</p>
          <p class="mt-1 text-xs text-slate-500">
            Konfirmasi diperlukan sebelum backend membuka transaksi database.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <AppButton
            v-if="!isJobTerminal"
            variant="secondary"
            :disabled="isJobProcessing || isConfirming"
            @click="showCancelConfirmation = true"
          >
            Batal
          </AppButton>
          <template v-if="currentJob.errorRows > 0 || currentJob.warningRows > 0">
            <select
              v-model="errorReportFormat"
              class="field w-24"
              :disabled="isDownloadingErrors"
              aria-label="Format laporan error"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </select>
            <AppButton
              variant="secondary"
              :icon="Download"
              :loading="isDownloadingErrors"
              @click="downloadCurrentErrors"
            >
              Laporan error
            </AppButton>
          </template>
          <AppButton
            v-if="!isJobTerminal"
            :icon="ShieldCheck"
            :disabled="!canConfirm"
            :loading="isConfirming"
            @click="showImportConfirmation = true"
          >
            {{ importButtonLabel }}
          </AppButton>
          <AppButton v-else :icon="RotateCcw" @click="startAnotherImport">
            Import file lain
          </AppButton>
        </div>
      </section>
    </template>

    <ImportHistoryTable
      :jobs="history"
      :configs="configs"
      :loading="isLoadingHistory"
      :error-message="historyError"
      :downloading-id="downloadingHistoryId"
      :page="historyPage"
      :total="historyTotal"
      :per-page="HISTORY_PAGE_SIZE"
      @refresh="loadHistory"
      @change-page="historyPage = $event; loadHistory()"
      @download-errors="downloadHistoryErrors"
    />

    <AppConfirmDialog
      :open="showImportConfirmation"
      title="Konfirmasi import data"
      :message="confirmationMessage"
      confirm-label="Ya, mulai import"
      :busy="isConfirming"
      :danger="false"
      @cancel="showImportConfirmation = false"
      @confirm="confirmImport"
    />

    <AppConfirmDialog
      :open="showCancelConfirmation"
      title="Batalkan import"
      message="Preview dan hasil validasi ini akan dibatalkan. Tidak ada data bisnis yang disimpan. Lanjutkan?"
      confirm-label="Batalkan import"
      :busy="isCancelling"
      @cancel="showCancelConfirmation = false"
      @confirm="cancelImport"
    />
  </div>
</template>
