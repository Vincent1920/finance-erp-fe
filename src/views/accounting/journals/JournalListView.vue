<script setup lang="ts">
import SearchableSelect from '@/components/common/SearchableSelect'
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowUpDown, Search } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppColumnPicker from '@/components/common/AppColumnPicker.vue'
import { journalService } from '@/services/journal.service'
import type { Journal } from '@/types/accounting'
import { getApiErrorMessage } from '@/utils/error'

const router = useRouter()
const route = useRoute()
const rows = ref<Journal[]>([])
const page = ref(1)
const total = ref(0)
const search = ref('')
const status = ref(typeof route.query.status === 'string' ? route.query.status : '')
const sort = ref('journal_date')
const order = ref<'asc' | 'desc'>('desc')
const loading = ref(false)
const error = ref('')
const columns = [
  { key: 'date', label: 'Tanggal' },
  { key: 'description', label: 'Deskripsi' },
  { key: 'source', label: 'Sumber' },
  { key: 'debit', label: 'Debit' },
  { key: 'status', label: 'Status' },
]
const visibleColumns = ref(columns.map((column) => column.key))
const visibleColumnCount = computed(() => visibleColumns.value.length + 1)
const shown = (key: string) => visibleColumns.value.includes(key)
const statusLabel: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  posted: 'Dibukukan',
  reversed: 'Dibalik',
  cancelled: 'Dibatalkan',
}
const money = (value: string | number) => new Intl.NumberFormat('id-ID').format(Number(value))
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await journalService.list({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
      status: status.value || undefined,
      sort: sort.value,
      order: order.value,
    })
    rows.value = response.data
    total.value = response.meta.total
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Daftar jurnal gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const toggleSort = (column: string) => {
  if (sort.value === column) order.value = order.value === 'asc' ? 'desc' : 'asc'
  else {
    sort.value = column
    order.value = 'asc'
  }
  page.value = 1
  void load()
}
const filter = () => {
  page.value = 1
  void load()
}
const changePage = (value: number) => {
  page.value = value
  void load()
}
let timer: number | undefined
watch(search, () => {
  window.clearTimeout(timer)
  timer = window.setTimeout(filter, 350)
})
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Daftar Jurnal</h1>
        <p class="text-sm text-slate-500">Jurnal manual dan jurnal dari transaksi operasional.</p>
      </div>
      <AppButton @click="router.push('/accounting/journals/new')">Buat Jurnal</AppButton>
    </header>
    <section class="panel overflow-hidden">
      <div class="flex gap-3 border-b p-4">
        <label class="relative flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            v-model="search"
            class="field pl-9"
            placeholder="Nomor, referensi, atau deskripsi"
            aria-label="Cari jurnal"
          />
        </label>
        <SearchableSelect v-model="status" class="field w-52" @change="filter">
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Menunggu Persetujuan</option>
          <option value="approved">Disetujui</option>
          <option value="posted">Posted</option>
          <option value="reversed">Reversed</option>
        </SearchableSelect>
        <AppColumnPicker
          v-model="visibleColumns"
          :columns="columns"
          storage-key="table:journals:columns"
        />
      </div>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div class="data-table-scroll">
        <table class="data-table w-full min-w-[780px] text-sm">
          <thead>
            <tr class="text-left">
              <th class="sticky-identity p-3">
                <button
                  class="inline-flex items-center gap-1"
                  @click="toggleSort('journal_number')"
                >
                  Nomor
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th v-if="shown('date')" class="p-3">
                <button class="inline-flex items-center gap-1" @click="toggleSort('journal_date')">
                  Tanggal
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th v-if="shown('description')" class="p-3">
                <button class="inline-flex items-center gap-1" @click="toggleSort('description')">
                  Deskripsi
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th v-if="shown('source')" class="p-3">
                <button class="inline-flex items-center gap-1" @click="toggleSort('source_type')">
                  Sumber
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th v-if="shown('debit')" class="p-3 text-right">
                <button class="inline-flex items-center gap-1" @click="toggleSort('total_debit')">
                  Debit
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th v-if="shown('status')" class="p-3">
                <button class="inline-flex items-center gap-1" @click="toggleSort('status')">
                  Status
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr><td :colspan="visibleColumnCount" class="p-8 text-center">Memuat...</td></tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="cursor-pointer border-b hover:bg-slate-50"
              @click="router.push(`/accounting/journals/${row.id}`)"
            >
              <td class="sticky-identity p-3 font-medium text-blue-700">
                {{ row.journal_number }}
              </td>
              <td v-if="shown('date')" class="p-3">{{ String(row.journal_date).slice(0, 10) }}</td>
              <td v-if="shown('description')" class="p-3">{{ row.description }}</td>
              <td v-if="shown('source')" class="p-3">{{ row.source_type || 'Manual' }}</td>
              <td v-if="shown('debit')" class="p-3 text-right">{{ money(row.total_debit) }}</td>
              <td v-if="shown('status')" class="p-3">
                <AppBadge tone="blue">{{ statusLabel[row.status] ?? row.status }}</AppBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState
        v-if="!loading && !rows.length && !error"
        title="Belum ada jurnal"
        description="Buat jurnal manual pertama atau ubah filter."
      />
      <div class="border-t p-4">
        <AppPagination :page="page" :total="total" :per-page="20" @change="changePage" />
      </div>
    </section>
  </div>
</template>
