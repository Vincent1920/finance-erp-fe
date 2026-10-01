<script setup lang="ts">
import SearchableSelect from '@/components/common/SearchableSelect'
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowUpDown, Download, Eye, Pencil, Plus, Search, X } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppColumnPicker from '@/components/common/AppColumnPicker.vue'
import AppDetailDrawer from '@/components/common/AppDetailDrawer.vue'
import { purchaseInvoiceService } from '@/services/purchase-invoice.service'
import { useAuthStore } from '@/stores/auth.store'
import type { PurchaseInvoice, PurchaseInvoiceStatus } from '@/types/purchase'
import { getApiErrorMessage } from '@/utils/error'
import { exportRows } from '@/utils/export'
import { useNotificationStore } from '@/stores/notification.store'
const router = useRouter(),
  auth = useAuthStore(),
  notifications = useNotificationStore(),
  rows = ref<PurchaseInvoice[]>([]),
  page = ref(1),
  total = ref(0),
  search = ref(''),
  status = ref(''),
  sort = ref('invoice_date'),
  order = ref<'asc' | 'desc'>('desc'),
  loading = ref(false),
  error = ref('')
const selectedRow = ref<PurchaseInvoice | null>(null)
const selectedIds = ref<number[]>([])
const selectedRows = computed(() => rows.value.filter((row) => selectedIds.value.includes(row.id)))
const allPageSelected = computed(() => Boolean(rows.value.length) && rows.value.every((row) => selectedIds.value.includes(row.id)))
const columns = [
  { key: 'date', label: 'Tanggal/Jatuh Tempo' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'total', label: 'Total' },
  { key: 'outstanding', label: 'Sisa Utang' },
  { key: 'status', label: 'Status' },
]
const visibleColumns = ref(columns.map((column) => column.key))
const visibleColumnCount = computed(() => visibleColumns.value.length + 3)
const shown = (key: string) => visibleColumns.value.includes(key)
const labels: Record<PurchaseInvoiceStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  posted: 'Dibukukan',
  partially_paid: 'Dibayar Sebagian',
  paid: 'Lunas',
  reversed: 'Dibalik',
  cancelled: 'Dibatalkan',
}
const tone = (s: PurchaseInvoiceStatus): 'green' | 'amber' | 'red' | 'blue' | 'slate' =>
  s === 'posted' || s === 'paid'
    ? 'green'
    : s === 'approved'
      ? 'blue'
      : s === 'pending_approval' || s === 'partially_paid'
        ? 'amber'
        : s === 'rejected' || s === 'reversed' || s === 'cancelled'
          ? 'red'
          : 'slate'
const money = (v: string | number, c = 'IDR') =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: c }).format(Number(v))
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const r = await purchaseInvoiceService.list({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
      status: status.value || undefined,
      sort: sort.value,
      order: order.value,
    })
    rows.value = r.data
    total.value = r.meta.total
    selectedIds.value = []
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Purchase invoice gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const togglePage = (checked: boolean) => { selectedIds.value = checked ? rows.value.map((row) => row.id) : [] }
const toggleRow = (id: number, checked: boolean) => {
  selectedIds.value = checked ? [...new Set([...selectedIds.value, id])] : selectedIds.value.filter((value) => value !== id)
}
const exportSelected = () => {
  exportRows(`invoice-pembelian-terpilih-${new Date().toLocaleDateString('en-CA')}`, [
    ['invoice_number', 'Nomor Invoice'], ['supplier_invoice_number', 'Nomor Invoice Supplier'],
    ['invoice_date', 'Tanggal'], ['due_date', 'Jatuh Tempo'], ['supplier_code', 'Kode Pemasok'],
    ['supplier_name', 'Nama Pemasok'], ['currency', 'Mata Uang'], ['grand_total', 'Total'],
    ['outstanding_amount', 'Sisa Utang'], ['status_label', 'Status'],
  ], selectedRows.value.map((row) => ({ ...row, invoice_date: row.invoice_date.slice(0, 10), due_date: row.due_date.slice(0, 10), status_label: labels[row.status] })))
  notifications.push(`${selectedRows.value.length} invoice pembelian berhasil diekspor.`)
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
const applyFilters = () => {
  page.value = 1
  void load()
}
const changePage = (nextPage: number) => {
  page.value = nextPage
  void load()
}
let timer: number | undefined
watch(search, () => {
  window.clearTimeout(timer)
  timer = window.setTimeout(applyFilters, 350)
})
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Purchase Invoice</h1>
        <p class="text-sm text-slate-500">
          Invoice supplier, approval, posting AP, pajak masukan, dan persediaan.
        </p>
      </div>
      <AppButton
        v-if="auth.hasPermission('purchase-invoices.create')"
        :icon="Plus"
        @click="router.push('/purchases/invoices/new')"
      >
        Buat Invoice
      </AppButton>
    </header>
    <section class="panel overflow-hidden">
      <div class="flex gap-3 border-b p-4">
        <label class="relative flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            v-model="search"
            class="field pl-9"
            placeholder="Nomor invoice atau supplier"
            aria-label="Cari purchase invoice"
          />
        </label>
        <SearchableSelect v-model="status" class="field w-52" @change="applyFilters">
          <option value="">Semua status</option>
          <option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option>
        </SearchableSelect>
        <AppColumnPicker
          v-model="visibleColumns"
          :columns="columns"
          storage-key="table:purchase-invoices:columns"
        />
      </div>
      <div v-if="selectedIds.length" class="flex flex-wrap items-center justify-between gap-3 border-b bg-blue-50 px-4 py-3 text-sm">
        <b>{{ selectedIds.length }} invoice dipilih</b>
        <div class="flex gap-2"><AppButton variant="secondary" :icon="Download" @click="exportSelected">Ekspor terpilih</AppButton><button type="button" class="inline-flex items-center gap-1 text-slate-600" @click="selectedIds = []"><X class="h-4 w-4" /> Bersihkan</button></div>
      </div>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
        <button class="ml-2 underline" @click="load">Coba lagi</button>
      </p>
      <div class="data-table-scroll">
        <table class="data-table w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr>
              <th class="w-10 p-3"><input type="checkbox" :checked="allPageSelected" aria-label="Pilih semua invoice pada halaman ini" @change="togglePage(($event.target as HTMLInputElement).checked)" /></th>
              <th class="sticky-identity p-3">
                <button
                  class="inline-flex items-center gap-1"
                  @click="toggleSort('invoice_number')"
                >
                  Nomor
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th v-if="shown('date')" class="p-3">
                <button class="inline-flex items-center gap-1" @click="toggleSort('invoice_date')">
                  Tanggal
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th v-if="shown('supplier')" class="p-3">Supplier</th>
              <th v-if="shown('total')" class="p-3 text-right">
                <button class="inline-flex items-center gap-1" @click="toggleSort('grand_total')">
                  Total
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th v-if="shown('outstanding')" class="p-3 text-right">Sisa Utang</th>
              <th v-if="shown('status')" class="p-3">
                <button class="inline-flex items-center gap-1" @click="toggleSort('status')">
                  Status
                  <ArrowUpDown class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="p-3"></th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr><td :colspan="visibleColumnCount" class="p-8 text-center">Memuat...</td></tr>
          </tbody>
          <tbody v-else class="divide-y">
            <tr v-for="row in rows" :key="row.id">
              <td class="p-3"><input type="checkbox" :checked="selectedIds.includes(row.id)" :aria-label="`Pilih ${row.invoice_number}`" @change="toggleRow(row.id, ($event.target as HTMLInputElement).checked)" /></td>
              <td class="sticky-identity p-3 font-mono font-semibold text-blue-700">
                {{ row.invoice_number }}
                <small class="block text-slate-500">{{ row.supplier_invoice_number }}</small>
              </td>
              <td v-if="shown('date')" class="p-3">
                {{ row.invoice_date.slice(0, 10) }}
                <small class="block text-slate-500">
                  Jatuh tempo {{ row.due_date.slice(0, 10) }}
                </small>
              </td>
              <td v-if="shown('supplier')" class="p-3">
                <b>{{ row.supplier_name }}</b>
                <small class="block">{{ row.supplier_code }}</small>
              </td>
              <td v-if="shown('total')" class="p-3 text-right">
                {{ money(row.grand_total, row.currency) }}
              </td>
              <td v-if="shown('outstanding')" class="p-3 text-right font-semibold">
                {{ money(row.outstanding_amount, row.currency) }}
              </td>
              <td v-if="shown('status')" class="p-3">
                <AppBadge :tone="tone(row.status)">{{ labels[row.status] }}</AppBadge>
              </td>
              <td class="p-3 text-right">
                <button
                  class="rounded p-2 hover:bg-slate-100"
                  aria-label="Lihat ringkasan invoice"
                  @click="selectedRow = row"
                >
                  <Eye class="h-4 w-4" />
                </button>
                <button
                  v-if="
                    ['draft', 'rejected'].includes(row.status) &&
                    !row.purchase_order_id &&
                    !row.goods_receipt_id &&
                    auth.hasPermission('purchase-invoices.update')
                  "
                  class="rounded p-2 hover:bg-slate-100"
                  @click="router.push(`/purchases/invoices/${row.id}/edit`)"
                >
                  <Pencil class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState
        v-if="!loading && !rows.length && !error"
        title="Belum ada purchase invoice"
        description="Buat invoice pertama atau ubah filter."
      />
      <div class="border-t p-4">
        <AppPagination :page="page" :total="total" :per-page="20" @change="changePage" />
      </div>
    </section>
    <AppDetailDrawer
      :open="Boolean(selectedRow)"
      :title="selectedRow?.invoice_number ?? 'Ringkasan Invoice'"
      subtitle="Ringkasan invoice pembelian"
      @close="selectedRow = null"
    >
      <dl v-if="selectedRow" class="grid grid-cols-[1fr_auto] gap-x-5 gap-y-4 text-sm">
        <dt class="text-slate-500">Supplier</dt>
        <dd class="text-right font-semibold">{{ selectedRow.supplier_name }}</dd>
        <dt class="text-slate-500">Nomor supplier</dt>
        <dd>{{ selectedRow.supplier_invoice_number || '—' }}</dd>
        <dt class="text-slate-500">Tanggal invoice</dt>
        <dd>{{ selectedRow.invoice_date.slice(0, 10) }}</dd>
        <dt class="text-slate-500">Jatuh tempo</dt>
        <dd>{{ selectedRow.due_date.slice(0, 10) }}</dd>
        <dt class="text-slate-500">Total</dt>
        <dd class="font-semibold">{{ money(selectedRow.grand_total, selectedRow.currency) }}</dd>
        <dt class="text-slate-500">Sisa utang</dt>
        <dd class="font-bold text-blue-700">
          {{ money(selectedRow.outstanding_amount, selectedRow.currency) }}
        </dd>
        <dt class="text-slate-500">Status</dt>
        <dd>
          <AppBadge :tone="tone(selectedRow.status)">{{ labels[selectedRow.status] }}</AppBadge>
        </dd>
      </dl>
      <template #footer>
        <AppButton class="w-full" @click="router.push(`/purchases/invoices/${selectedRow?.id}`)">
          Buka Detail Lengkap
        </AppButton>
      </template>
    </AppDetailDrawer>
  </div>
</template>
