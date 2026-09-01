<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  ArrowDownAZ,
  Download,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-vue-next'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import type { EntityRecord } from '@/types/master'
import type {
  MasterWorkspaceConfig,
  WorkspaceColumn,
  WorkspaceField,
  WorkspaceOption,
} from '@/types/workspace'
import { getApiErrorMessage, getValidationErrors } from '@/utils/error'

type FormValue = string | number | boolean | null
type FormMode = 'create' | 'edit' | 'detail'

const props = defineProps<{ config: MasterWorkspaceConfig }>()
const auth = useAuthStore()
const notifications = useNotificationStore()
const rows = ref<EntityRecord[]>([])
const search = ref('')
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const sort = ref(props.config.defaultSort ?? 'id')
const order = ref<'asc' | 'desc'>('desc')
const filterValues = reactive<Record<string, string | number | boolean | null>>({})
const isLoading = ref(false)
const listError = ref('')
const modalMode = ref<FormMode | null>(null)
const selected = ref<EntityRecord | null>(null)
const form = reactive<Record<string, FormValue>>({})
const fieldErrors = reactive<Record<string, string>>({})
const options = reactive<Record<string, WorkspaceOption[]>>({})
const isSaving = ref(false)
const isLoadingDetail = ref(false)
const isExporting = ref(false)
const pendingDelete = ref<EntityRecord | null>(null)
const isDeleting = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestSequence = 0

const modalTitle = computed(() => {
  if (modalMode.value === 'create') return `Tambah ${props.config.singular}`
  if (modalMode.value === 'edit') return `Edit ${props.config.singular}`
  return `Detail ${props.config.singular}`
})
const canCreate = computed(() => auth.hasPermission(`${props.config.permissionPrefix}.create`))
const canUpdate = computed(() => auth.hasPermission(`${props.config.permissionPrefix}.update`))
const canDelete = computed(
  () =>
    props.config.canDelete !== false &&
    auth.hasPermission(`${props.config.permissionPrefix}.delete`),
)
const canExport = computed(() => auth.hasPermission(`${props.config.permissionPrefix}.export`))

const requestParams = (requestedPage = page.value, requestedLimit = perPage.value) => ({
  page: requestedPage,
  limit: requestedLimit,
  search: search.value.trim() || undefined,
  sort: sort.value,
  order: order.value,
  ...Object.fromEntries(
    Object.entries(filterValues).map(([key, value]) => [key, value === '' ? undefined : value]),
  ),
})

const fetchRows = async () => {
  const requestId = ++requestSequence
  isLoading.value = true
  listError.value = ''
  try {
    const response = await props.config.service.list(requestParams())
    if (requestId !== requestSequence) return
    rows.value = response.data
    total.value = response.meta.total
    if (response.meta.page !== page.value) page.value = response.meta.page
  } catch (error) {
    if (requestId !== requestSequence) return
    rows.value = []
    total.value = 0
    listError.value = getApiErrorMessage(error, `Gagal memuat ${props.config.title.toLowerCase()}.`)
  } finally {
    if (requestId === requestSequence) isLoading.value = false
  }
}

const loadOptions = async () => {
  await Promise.all(
    props.config.fields.map(async (field) => {
      if (!field.options) return
      if (Array.isArray(field.options)) {
        options[field.key] = field.options
        return
      }
      try {
        options[field.key] = await field.options()
      } catch (error) {
        options[field.key] = []
        notifications.push(
          getApiErrorMessage(error, `Pilihan ${field.label.toLowerCase()} gagal dimuat.`),
          'error',
        )
      }
    }),
  )
}

const clearForm = () => {
  for (const key of Object.keys(form)) delete form[key]
  for (const key of Object.keys(fieldErrors)) delete fieldErrors[key]
}

const populateForm = (record?: EntityRecord) => {
  clearForm()
  for (const field of props.config.fields) {
    const fallback =
      field.defaultValue !== undefined
        ? field.defaultValue
        : field.type === 'checkbox'
          ? false
          : null
    const value = record?.[field.key] ?? fallback
    form[field.key] =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? value
        : null
  }
}

const openCreate = () => {
  selected.value = null
  populateForm()
  modalMode.value = 'create'
}

const openRecord = async (record: EntityRecord, mode: 'detail' | 'edit') => {
  selected.value = record
  populateForm(record)
  modalMode.value = mode
  isLoadingDetail.value = true
  try {
    const fresh = await props.config.service.get(record.id)
    selected.value = fresh
    populateForm(fresh)
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Detail data gagal dimuat.'), 'error')
    modalMode.value = null
  } finally {
    isLoadingDetail.value = false
  }
}

const closeModal = () => {
  if (isSaving.value) return
  modalMode.value = null
  selected.value = null
  clearForm()
}

const selectOptions = (field: WorkspaceField) => options[field.key] ?? []
const inputValue = (key: string): string | number | null => {
  const value = form[key]
  return typeof value === 'boolean' ? null : value
}

const validate = () => {
  for (const key of Object.keys(fieldErrors)) delete fieldErrors[key]
  for (const field of props.config.fields) {
    const value = form[field.key]
    if (field.required && (value === null || value === '' || value === undefined)) {
      fieldErrors[field.key] = `${field.label} wajib diisi.`
      continue
    }
    if (value === null || value === '') continue
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      fieldErrors[field.key] = 'Format email tidak valid.'
    }
    if (field.type === 'number') {
      const number = Number(value)
      if (!Number.isFinite(number)) fieldErrors[field.key] = 'Nilai harus berupa angka.'
      else if (field.min !== undefined && number < field.min)
        fieldErrors[field.key] = `Nilai minimum ${field.min}.`
      else if (field.max !== undefined && number > field.max)
        fieldErrors[field.key] = `Nilai maksimum ${field.max}.`
    }
    if (typeof value === 'string' && field.minLength && value.trim().length < field.minLength)
      fieldErrors[field.key] = `Minimal ${field.minLength} karakter.`
    if (typeof value === 'string' && field.maxLength && value.length > field.maxLength)
      fieldErrors[field.key] = `Maksimal ${field.maxLength} karakter.`
  }
  Object.assign(fieldErrors, props.config.validate?.(form) ?? {})
  return Object.keys(fieldErrors).length === 0
}

const payloadFromForm = () => {
  const payload: Record<string, unknown> = {}
  for (const field of props.config.fields) {
    if (modalMode.value === 'edit' && field.readOnlyOnEdit) continue
    const value = form[field.key]
    if (value === '' || value === undefined) {
      if (field.nullable) payload[field.key] = null
      continue
    }
    if (field.type === 'number' || field.valueType === 'number') {
      payload[field.key] = value === null ? null : Number(value)
    } else if (typeof value === 'string') {
      payload[field.key] = value.trim()
    } else {
      payload[field.key] = value
    }
  }
  return payload
}

const save = async () => {
  if (!validate()) return
  isSaving.value = true
  try {
    if (modalMode.value === 'edit' && selected.value) {
      await props.config.service.update(selected.value.id, payloadFromForm())
      notifications.push(`${props.config.singular} berhasil diperbarui.`)
    } else {
      await props.config.service.create(payloadFromForm())
      notifications.push(`${props.config.singular} berhasil ditambahkan.`)
    }
    closeModal()
    await fetchRows()
  } catch (error) {
    const backendErrors = getValidationErrors(error)
    for (const [key, messages] of Object.entries(backendErrors)) {
      fieldErrors[key] = messages[0] ?? 'Data tidak valid.'
    }
    notifications.push(getApiErrorMessage(error, 'Data gagal disimpan.'), 'error')
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = async () => {
  if (!pendingDelete.value) return
  isDeleting.value = true
  try {
    const message = await props.config.service.remove(pendingDelete.value.id)
    notifications.push(message)
    pendingDelete.value = null
    await fetchRows()
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Data tidak dapat dinonaktifkan.'), 'error')
  } finally {
    isDeleting.value = false
  }
}

const statusTone = (value: unknown) => {
  if (value === true || value === 'active' || value === 'open') return 'green'
  if (value === 'soft_closed' || value === 'pending') return 'amber'
  if (value === false || value === 'inactive' || value === 'closed') return 'slate'
  if (value === 'locked') return 'red'
  return 'blue'
}
const statusLabel = (value: unknown) => {
  const labels: Record<string, string> = {
    true: 'Aktif',
    false: 'Nonaktif',
    active: 'Aktif',
    inactive: 'Nonaktif',
    locked: 'Terkunci',
    open: 'Terbuka',
    soft_closed: 'Ditutup sementara',
    closed: 'Ditutup',
  }
  return labels[String(value)] ?? String(value ?? '—')
}
const formatValue = (column: WorkspaceColumn, row: EntityRecord) => {
  const value = row[column.key]
  if (column.format) return column.format(value, row)
  if (value === null || value === undefined || value === '') return '—'
  if (column.type === 'boolean') return Boolean(value) ? 'Aktif' : 'Nonaktif'
  if (column.type === 'currency')
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
      Number(value),
    )
  if (column.type === 'number') return new Intl.NumberFormat('id-ID').format(Number(value))
  if (column.type === 'date' || column.type === 'datetime') {
    const date = new Date(String(value))
    if (Number.isNaN(date.valueOf())) return String(value)
    return new Intl.DateTimeFormat(
      'id-ID',
      column.type === 'datetime'
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' },
    ).format(date)
  }
  return String(value)
}
const detailValue = (field: WorkspaceField) => {
  const value = selected.value?.[field.key]
  if (field.type === 'checkbox') return Boolean(value) ? 'Ya' : 'Tidak'
  if (field.type === 'select') {
    return (
      selectOptions(field).find((option) => String(option.value) === String(value))?.label ??
      String(value ?? '—')
    )
  }
  if (field.type === 'number' && value !== null && value !== undefined)
    return new Intl.NumberFormat('id-ID').format(Number(value))
  return String(value ?? '—')
}

const changeSort = (column: WorkspaceColumn) => {
  if (!column.sortable) return
  if (sort.value === column.key) order.value = order.value === 'asc' ? 'desc' : 'asc'
  else {
    sort.value = column.key
    order.value = 'asc'
  }
  page.value = 1
  fetchRows()
}

const csvEscape = (value: string) => `"${value.replaceAll('"', '""')}"`
const exportCsv = async () => {
  isExporting.value = true
  try {
    const first = await props.config.service.list(requestParams(1, 200))
    const exportRows = [...first.data]
    for (let exportPage = 2; exportPage <= first.meta.totalPages; exportPage += 1) {
      const response = await props.config.service.list(requestParams(exportPage, first.meta.limit))
      exportRows.push(...response.data)
    }
    const csv = [
      props.config.columns.map((column) => csvEscape(column.label)).join(','),
      ...exportRows.map((row) =>
        props.config.columns.map((column) => csvEscape(formatValue(column, row))).join(','),
      ),
    ].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = props.config.exportFileName ?? `${props.config.permissionPrefix}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notifications.push(`${exportRows.length} baris berhasil diekspor.`)
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Ekspor CSV gagal.'), 'error')
  } finally {
    isExporting.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchRows()
  }, 350)
})
watch(
  filterValues,
  () => {
    page.value = 1
    fetchRows()
  },
  { deep: true },
)
watch(perPage, () => {
  page.value = 1
  fetchRows()
})
onMounted(async () => {
  for (const filter of props.config.filters ?? []) filterValues[filter.key] = ''
  await Promise.all([loadOptions(), fetchRows()])
})
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ config.title }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ config.description }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton
          v-if="canExport"
          variant="secondary"
          :icon="Download"
          :loading="isExporting"
          @click="exportCsv"
        >
          Ekspor CSV
        </AppButton>
        <AppButton v-if="canCreate" :icon="Plus" @click="openCreate">
          Tambah {{ config.singular }}
        </AppButton>
      </div>
    </div>

    <section class="panel overflow-hidden">
      <div class="flex flex-wrap gap-3 border-b p-4">
        <label class="relative min-w-56 flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            v-model="search"
            class="field pl-9"
            :placeholder="`Cari ${config.singular.toLowerCase()}...`"
          />
        </label>
        <select
          v-for="filter in config.filters"
          :key="filter.key"
          v-model="filterValues[filter.key]"
          class="field w-full sm:w-48"
          :aria-label="filter.label"
        >
          <option value="">Semua {{ filter.label.toLowerCase() }}</option>
          <option v-for="option in filter.options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model.number="perPage" class="field w-28" aria-label="Baris per halaman">
          <option :value="10">10 baris</option>
          <option :value="20">20 baris</option>
          <option :value="50">50 baris</option>
        </select>
        <AppButton variant="secondary" :icon="RefreshCw" :loading="isLoading" @click="fetchRows">
          Muat ulang
        </AppButton>
      </div>

      <div
        v-if="listError"
        class="m-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700"
      >
        <span>{{ listError }}</span>
        <AppButton variant="secondary" @click="fetchRows">Coba lagi</AppButton>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th
                v-for="column in config.columns"
                :key="column.key"
                class="px-4 py-3"
                :class="column.align === 'right' && 'text-right'"
              >
                <button
                  v-if="column.sortable"
                  type="button"
                  class="inline-flex items-center gap-1 hover:text-blue-600"
                  @click="changeSort(column)"
                >
                  {{ column.label }}
                  <ArrowDownAZ class="h-3.5 w-3.5" />
                </button>
                <template v-else>{{ column.label }}</template>
              </th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="isLoading" class="divide-y">
            <tr v-for="index in 5" :key="index">
              <td :colspan="config.columns.length + 1" class="px-4 py-4">
                <div class="h-5 animate-pulse rounded bg-slate-100" />
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="rows.length" class="divide-y">
            <tr v-for="row in rows" :key="row.id" class="hover:bg-slate-50">
              <td
                v-for="column in config.columns"
                :key="column.key"
                class="px-4 py-3"
                :class="column.align === 'right' && 'text-right tabular-nums'"
              >
                <AppBadge
                  v-if="column.type === 'status' || column.type === 'boolean'"
                  :tone="statusTone(row[column.key])"
                >
                  {{ statusLabel(row[column.key]) }}
                </AppBadge>
                <span
                  v-else
                  :class="
                    column.key === 'code' || column.key === 'sku'
                      ? 'font-mono font-semibold text-blue-700'
                      : ''
                  "
                >
                  {{ formatValue(column, row) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button
                    type="button"
                    class="rounded p-2 text-slate-500 hover:bg-slate-100"
                    title="Lihat detail"
                    @click="openRecord(row, 'detail')"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    v-if="canUpdate"
                    type="button"
                    class="rounded p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                    title="Edit"
                    @click="openRecord(row, 'edit')"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    v-if="canDelete"
                    type="button"
                    class="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    :title="config.deleteLabel ?? 'Nonaktifkan'"
                    @click="pendingDelete = row"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState
        v-if="!isLoading && !rows.length && !listError"
        :title="`Belum ada ${config.title.toLowerCase()}`"
        description="Gunakan tombol tambah untuk membuat data pertama atau ubah filter pencarian."
      />
      <div class="border-t p-4">
        <AppPagination
          :page="page"
          :total="total"
          :per-page="perPage"
          @change="
            page = $event
            fetchRows()
          "
        />
      </div>
    </section>

    <AppModal
      :open="Boolean(modalMode)"
      :title="modalTitle"
      size="lg"
      :close-disabled="isSaving"
      @close="closeModal"
    >
      <div v-if="isLoadingDetail" class="space-y-3">
        <div v-for="index in 4" :key="index" class="h-10 animate-pulse rounded bg-slate-100" />
      </div>
      <dl v-else-if="modalMode === 'detail'" class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="field in config.fields"
          :key="field.key"
          :class="field.span === 2 && 'sm:col-span-2'"
        >
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {{ field.label }}
          </dt>
          <dd class="mt-1 whitespace-pre-wrap text-sm text-slate-800">{{ detailValue(field) }}</dd>
        </div>
      </dl>
      <form
        v-else-if="modalMode"
        id="master-data-form"
        class="grid gap-4 sm:grid-cols-2"
        @submit.prevent="save"
      >
        <div
          v-for="field in config.fields"
          :key="field.key"
          :class="field.span === 2 && 'sm:col-span-2'"
        >
          <label
            v-if="field.type === 'checkbox'"
            class="flex items-start gap-3 rounded-lg border p-3 text-sm"
          >
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
              :checked="Boolean(form[field.key])"
              @change="form[field.key] = ($event.target as HTMLInputElement).checked"
            />
            <span>
              <b class="block text-slate-700">{{ field.label }}</b>
              <small v-if="field.help" class="text-slate-500">{{ field.help }}</small>
            </span>
          </label>
          <label v-else-if="field.type === 'textarea'" class="block text-sm">
            <span class="mb-1.5 block font-medium text-slate-700">
              {{ field.label }}
              <b v-if="field.required" class="text-red-500">*</b>
            </span>
            <textarea
              :value="inputValue(field.key)"
              rows="3"
              class="field"
              :class="fieldErrors[field.key] && 'border-red-400'"
              :placeholder="field.placeholder"
              @input="form[field.key] = ($event.target as HTMLTextAreaElement).value"
            />
            <span v-if="fieldErrors[field.key]" class="mt-1 block text-xs text-red-600">
              {{ fieldErrors[field.key] }}
            </span>
          </label>
          <AppSelect
            v-else-if="field.type === 'select'"
            :model-value="inputValue(field.key)"
            :label="field.label"
            :options="selectOptions(field)"
            :required="field.required"
            :error="fieldErrors[field.key]"
            :value-type="field.valueType"
            empty-label="Pilih..."
            @update:model-value="form[field.key] = $event"
          />
          <AppInput
            v-else
            :model-value="inputValue(field.key)"
            :label="field.label"
            :type="field.type ?? 'text'"
            :placeholder="field.placeholder"
            :required="field.required"
            :error="fieldErrors[field.key]"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            :disabled="modalMode === 'edit' && field.readOnlyOnEdit"
            @update:model-value="form[field.key] = $event"
          />
          <p v-if="field.help && field.type !== 'checkbox'" class="mt-1 text-xs text-slate-400">
            {{ field.help }}
          </p>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="isSaving" @click="closeModal">Tutup</AppButton>
        <AppButton
          v-if="modalMode === 'detail' && canUpdate"
          :icon="Pencil"
          @click="modalMode = 'edit'"
        >
          Edit
        </AppButton>
        <AppButton
          v-else-if="modalMode !== 'detail'"
          type="submit"
          form="master-data-form"
          :loading="isSaving"
        >
          Simpan
        </AppButton>
      </template>
    </AppModal>

    <AppConfirmDialog
      :open="Boolean(pendingDelete)"
      :title="config.deleteLabel ?? `Nonaktifkan ${config.singular}`"
      :message="`${config.singular} '${String(pendingDelete?.name ?? pendingDelete?.code ?? pendingDelete?.id ?? '')}' akan dinonaktifkan atau dihapus sesuai aturan referensi transaksi. Lanjutkan?`"
      :confirm-label="config.deleteLabel ?? 'Nonaktifkan'"
      :busy="isDeleting"
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </div>
</template>
