<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-vue-next'
import { useRoute, RouterLink } from 'vue-router'
import api from '@/services/api/client'
import { itemService } from '@/services/item.service'
import { warehouseService } from '@/services/warehouse.service'
import { accountService } from '@/services/account.service'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCombobox from '@/components/common/AppCombobox.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppNumberInput from '@/components/common/AppNumberInput.vue'
import { getApiErrorMessage } from '@/utils/error'
import { useAuthStore } from '@/stores/auth.store'
import { exportRows } from '@/utils/export'
import { inventoryService } from '@/services/inventory.service'
import SavedFilterBar from '@/components/common/SavedFilterBar.vue'
const route = useRoute(),
  auth = useAuthStore()
const report = computed(() => route.path.endsWith('/reports')),
  transfer = computed(() => route.path.endsWith('/transfers'))
const title = computed(() =>
  report.value ? 'Laporan Mutasi Stok' : transfer.value ? 'Transfer Stok' : 'Penyesuaian Stok',
)
const kind = computed(() => (transfer.value ? 'stock-transfers' : 'stock-adjustments'))
const canPost = computed(
  () => auth.hasPermission(`${kind.value}.create`) && auth.hasPermission(`${kind.value}.post`),
)
type Row = Record<string, string | number | null>
type UnitOption = { value: number; label: string }
type ItemOption = { value: number; label: string; sku: string; name: string }
type FormLine = { item_id: number; unit_id: number; quantity: number; actual_quantity: number; system_quantity?: number; gain_loss_account_id: number; unit_cost: number; units: UnitOption[] }
const rows = ref<Row[]>([]),
  items = ref<ItemOption[]>([]),
  warehouses = ref<{ value: number; label: string }[]>([]),
  accounts = ref<{ value: number; label: string }[]>([])
const now = new Date(),
  today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  from = ref(`${today.slice(0, 8)}01`),
  to = ref(today),
  selectedItems = ref<number[]>([]),
  warehouse = ref<number | null>(null),
  search = ref(''),
  sortKey = ref('movement_date'),
  sortDirection = ref<'asc' | 'desc'>('asc'),
  loading = ref(false),
  busy = ref(false),
  open = ref(false),
  error = ref('')
const countFile = ref<HTMLInputElement | null>(null), defaultAdjustmentAccount = ref(0)
const form = reactive({
  request_key: '',
  date: today,
  warehouse_id: 0,
  to_warehouse_id: 0,
  reason: '',
  reference: '',
  lines: [] as FormLine[],
})
const numericColumns = new Set(['quantity_in','quantity_out','smallest_quantity_in','smallest_quantity_out','chronological_quantity','unit_cost','total_cost','chronological_value'])
const shown = computed(() => {
  const filtered = rows.value.filter((r) =>
    Object.values(r).join(' ').toLowerCase().includes(search.value.toLowerCase()),
  )
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...filtered].sort((a, b) => {
    const left = a[sortKey.value], right = b[sortKey.value]
    if (numericColumns.has(sortKey.value)) return (Number(left ?? 0) - Number(right ?? 0)) * direction
    return String(left ?? '').localeCompare(String(right ?? ''), 'id', { numeric: true }) * direction
  })
})
const formatCell = (key: string, value: unknown) => numericColumns.has(key)
  ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: key.includes('quantity') ? 1 : 2 }).format(Number(value ?? 0))
  : value
const columns = computed(() =>
  report.value
    ? [
        ['movement_date', 'Tanggal'],
        ['transaction_number', 'Dokumen'],
        ['sku', 'Kode Barang'],
        ['item_name', 'Nama Barang'],
        ['warehouse_code', 'Kode Gudang'],
        ['warehouse_name', 'Gudang'],
        ['quantity_in', 'Masuk'],
        ['quantity_out', 'Keluar'],
        ['unit_symbol', 'Satuan'],
        ['smallest_quantity_in', 'Masuk (terkecil)'],
        ['smallest_quantity_out', 'Keluar (terkecil)'],
        ['smallest_unit_symbol', 'Satuan Terkecil'],
        ['chronological_quantity', 'Saldo QTY'],
        ['unit_cost', 'Biaya Satuan'],
        ['total_cost', 'Nilai Mutasi'],
        ['chronological_value', 'Saldo Nilai'],
      ]
    : [
        ['number', 'Nomor'],
        ['date', 'Tanggal'],
        ['reference', 'Referensi'],
        ['status', 'Status'],
      ],
)
const savedFilters = computed(() => ({ date_from: from.value, date_to: to.value, item_ids: selectedItems.value, warehouse_id: warehouse.value, search: search.value }))
function applySavedFilters(filters: Record<string, unknown>) {
  from.value = String(filters.date_from ?? from.value)
  to.value = String(filters.date_to ?? to.value)
  const savedItems = filters.item_ids ?? filters.item_id
  selectedItems.value = Array.isArray(savedItems)
    ? savedItems.map(Number).filter(Boolean)
    : savedItems
      ? String(savedItems).split(',').map(Number).filter(Boolean)
      : []
  warehouse.value = filters.warehouse_id ? Number(filters.warehouse_id) : null
  search.value = String(filters.search ?? '')
  load()
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    if (report.value) {
      if (from.value > to.value) throw new Error('Tanggal awal melebihi akhir')
      const params = {
        date_from: from.value,
        date_to: to.value,
        item_ids: selectedItems.value.length ? selectedItems.value.join(',') : undefined,
        warehouse_id: warehouse.value ?? undefined,
        limit: 200,
        page: 1,
      }
      const first = (await api.get('/inventory/card', { params })).data
      const all = [...first.data]
      for (let p = 2; p <= first.meta.totalPages; p++)
        all.push(
          ...(await api.get('/inventory/card', { params: { ...params, page: p } })).data.data,
        )
      rows.value = all
    } else rows.value = (await api.get(`/operations/${kind.value}`)).data.data
  } catch (e) {
    rows.value = []
    error.value = getApiErrorMessage(e, 'Data gagal dimuat.')
  } finally {
    loading.value = false
  }
}
function show() {
  form.request_key = crypto.randomUUID()
  form.lines = []
  addLine()
  open.value = true
}
function sortBy(key: string) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDirection.value = 'asc' }
}
function addLine() {
  form.lines.push({ item_id: 0, unit_id: 0, quantity: 1, actual_quantity: 0, gain_loss_account_id: 0, unit_cost: 0, units: [] })
}
async function stockRowsForWarehouse() {
  if (!form.warehouse_id) throw new Error('Pilih gudang terlebih dahulu.')
  const first = await inventoryService.overview({ warehouse_id: form.warehouse_id, limit: 100, page: 1 })
  const all = [...first.data]
  for (let page = 2; page <= first.meta.totalPages; page++)
    all.push(...(await inventoryService.overview({ warehouse_id: form.warehouse_id, limit: 100, page })).data)
  return all
}
async function exportStockCount() {
  try {
    const stock = await stockRowsForWarehouse()
    exportRows(`stok-opname-${form.date}`, [
      ['sku', 'kode_barang'], ['item_name', 'nama_barang'], ['unit_symbol', 'satuan_stok'],
      ['quantity', 'saldo_sistem'], ['actual_quantity', 'jumlah_fisik'], ['average_cost', 'biaya_satuan'],
    ], stock.map((row) => ({ ...row, actual_quantity: '' })))
  } catch (e) { error.value = getApiErrorMessage(e, 'Form stok opname gagal diekspor.') }
}
function parseCsv(text: string) {
  const output: string[][] = []; let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++ }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell); if (row.some((value) => value.trim())) output.push(row); row = []; cell = ''
    } else cell += char
  }
  if (cell || row.length) { row.push(cell); output.push(row) }
  return output
}
async function importStockCount(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  try {
    if (!form.warehouse_id) throw new Error('Pilih gudang sebelum mengimpor.')
    if (!defaultAdjustmentAccount.value) throw new Error('Pilih akun laba/rugi selisih terlebih dahulu.')
    const table = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
    const headers = table.shift()?.map((value) => value.trim().toLowerCase()) ?? []
    const skuIndex = headers.indexOf('kode_barang'), actualIndex = headers.indexOf('jumlah_fisik')
    if (skuIndex < 0 || actualIndex < 0) throw new Error('Kolom kode_barang dan jumlah_fisik wajib tersedia.')
    const stock = await stockRowsForWarehouse()
    const stockBySku = new Map(stock.map((row) => [row.sku, row]))
    const imported: FormLine[] = []
    for (const source of table) {
      const sku = source[skuIndex]?.trim(), raw = source[actualIndex]?.trim()
      if (!sku || raw === '') continue
      const itemOption = items.value.find((entry) => entry.sku === sku), stockRow = stockBySku.get(sku)
      const actual = Number(String(raw).replaceAll('.', '').replace(',', '.'))
      if (!itemOption || !stockRow || !Number.isFinite(actual) || actual < 0) throw new Error(`Data stok tidak valid untuk kode ${sku}.`)
      const line: FormLine = { item_id: itemOption.value, unit_id: 0, quantity: 1, actual_quantity: actual,
        system_quantity: Number(stockRow.quantity), gain_loss_account_id: defaultAdjustmentAccount.value,
        unit_cost: Number(stockRow.average_cost), units: [] }
      await loadUnits(line); imported.push(line)
    }
    if (!imported.length) throw new Error('Isi kolom jumlah_fisik untuk minimal satu barang.')
    form.lines = imported
  } catch (e) { error.value = e instanceof Error ? e.message : 'File stok opname gagal diimpor.' }
  finally { if (countFile.value) countFile.value.value = '' }
}
async function loadUnits(line: FormLine) {
  line.unit_id = 0
  line.units = []
  if (!line.item_id) return
  const response = await api.get(`/operations/items/${line.item_id}/units`)
  line.units = response.data.data.filter((u: Record<string, unknown>) => Boolean(u.is_active)).map((u: Record<string, unknown>) => ({
    value: Number(u.unit_id),
    label: `${String(u.code)} — ${String(u.name)} (1 = ${String(u.factor_to_stock)} satuan stok)`,
  }))
  line.unit_id = line.units[0]?.value ?? 0
}
async function save() {
  busy.value = true
  error.value = ''
  try {
    await api.post(`/operations/${kind.value}`, {
      request_key: form.request_key,
      date: form.date,
      warehouse_id: form.warehouse_id,
      reason: form.reason,
      reference: form.reference,
      to_warehouse_id: transfer.value ? form.to_warehouse_id : undefined,
      lines: form.lines.map((line) => ({
        item_id: line.item_id,
        unit_id: line.unit_id,
        quantity: transfer.value ? line.quantity : undefined,
        actual_quantity: transfer.value ? undefined : line.actual_quantity,
        gain_loss_account_id: transfer.value ? undefined : line.gain_loss_account_id,
        unit_cost: !transfer.value && line.unit_cost ? line.unit_cost : undefined,
      })),
    })
    open.value = false
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Posting stok gagal.')
  } finally {
    busy.value = false
  }
}
async function reverseRow(row: Row) {
  const reason = window.prompt('Alasan pembalikan transaksi stok:')?.trim()
  if (!reason) return
  busy.value = true
  error.value = ''
  try {
    await api.post(`/operations/${kind.value}/${row.id}/reverse`, { request_key: crypto.randomUUID(), date: today, reason })
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pembalikan transaksi stok gagal.')
  } finally { busy.value = false }
}
onMounted(async () => {
  await load()
  try {
    const [i, w, a] = await Promise.all([
      itemService.all({ limit: 200, is_active: true, item_type: 'inventory' }),
      warehouseService.all({ limit: 200, is_active: true }),
      accountService.all({ limit: 200, is_active: true, is_posting: true }),
    ])
    items.value = i.data.map((r) => ({ value: r.id, label: `${r.sku} — ${r.name}`, sku: r.sku, name: r.name }))
    warehouses.value = w.data.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))
    accounts.value = a.data.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pilihan gagal dimuat.')
  }
})
watch(
  () => route.path,
  () => {
    open.value = false
    load()
  },
)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-5 flex flex-wrap justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          Kuantitas transaksi mengikuti satuan stok. Transfer menjaga nilai stok; penyesuaian
          membuat jurnal selisih.
        </p>
      </div>
      <div class="flex gap-2">
        <AppButton
          variant="secondary"
          :disabled="loading || !shown.length"
          @click="exportRows(title, columns, shown)"
        >
          Ekspor CSV
        </AppButton>
        <AppButton v-if="!report && canPost" @click="show">Tambah</AppButton>
      </div>
    </header>
    <nav class="mb-4 flex gap-4 text-sm text-blue-600">
      <RouterLink to="/inventory/stock">Saldo Stok</RouterLink>
      <RouterLink to="/inventory/reports">Mutasi Stok</RouterLink>
      <RouterLink to="/inventory/transfers">Transfer</RouterLink>
      <RouterLink to="/inventory/adjustments">Penyesuaian</RouterLink>
    </nav>
    <section class="panel p-5">
      <SavedFilterBar v-if="report" class="mb-4" screen-key="inventory:movements" :filters="savedFilters" @apply="applySavedFilters" />
      <form class="mb-4 flex flex-wrap items-end gap-3" @submit.prevent="load">
        <template v-if="report">
          <label>
            Dari
            <input v-model="from" type="date" class="field" required />
          </label>
          <label>
            Sampai
            <input v-model="to" type="date" class="field" required />
          </label>
          <AppCombobox
            :model-value="selectedItems"
            :options="items"
            label="Barang"
            empty-label="Semua barang"
            placeholder="Ketik kode atau nama barang…"
            result-label="barang"
            multiple
            @update:model-value="selectedItems = Array.isArray($event) ? $event.map(Number) : []"
          />
          <AppSelect
            :model-value="warehouse"
            :options="warehouses"
            label="Gudang"
            value-type="number"
            @update:model-value="warehouse = $event === null ? null : Number($event)"
          />
        </template>
        <AppButton type="submit" :loading="loading">Muat</AppButton>
      </form>
      <input
        v-model="search"
        type="search"
        class="field mb-4 max-w-lg"
        placeholder="Ketik kode barang, nama, atau dokumen…"
      />
      <p v-if="error && !open" class="p-3 text-red-600">{{ error }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th v-for="c in columns" :key="c[0]" class="p-3 whitespace-nowrap">
                <button type="button" class="inline-flex items-center gap-1 font-semibold" @click="sortBy(c[0]!)">
                  {{ c[1] }}
                  <ArrowUp v-if="sortKey === c[0] && sortDirection === 'asc'" class="h-3.5 w-3.5" />
                  <ArrowDown v-else-if="sortKey === c[0]" class="h-3.5 w-3.5" />
                  <ArrowUpDown v-else class="h-3.5 w-3.5 text-slate-400" />
                </button>
              </th>
              <th v-if="!report" class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td :colspan="columns.length" class="p-8">Memuat…</td></tr>
            <tr
              v-for="(r, index) in shown"
              v-else
              :key="index"
              class="border-t"
              :class="r.row_kind === 'opening' && 'bg-blue-50 font-semibold'"
            >
              <td v-for="c in columns" :key="c[0]" class="p-3 whitespace-nowrap">
                {{ c[0]?.includes('date') ? String(r[c[0]]).slice(0, 10) : formatCell(c[0]!, r[c[0]!]) }}
              </td>
              <td v-if="!report" class="p-3">
                <AppButton v-if="r.status === 'posted' && auth.hasPermission(`${kind}.reverse`)" variant="secondary" :disabled="busy" @click="reverseRow(r)">Balikkan</AppButton>
              </td>
            </tr>
            <tr v-if="!loading && !shown.length">
              <td :colspan="columns.length" class="p-8 text-center text-slate-500">
                Tidak ada data pada filter ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <AppModal :open="open" :title="title" :close-disabled="busy" @close="open = false">
      <form id="stock-operation" class="grid gap-4" @submit.prevent="save">
        <p v-if="error" class="text-red-600">{{ error }}</p>
        <label>
          Tanggal
          <input v-model="form.date" type="date" class="field" required />
        </label>
        <AppSelect
          v-model="form.warehouse_id"
          :options="warehouses"
          label="Gudang asal"
          value-type="number"
          required
        />
        <div v-if="!transfer" class="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 class="font-semibold text-blue-900">Stok opname melalui Excel / CSV</h3>
          <p class="mb-3 mt-1 text-sm text-blue-700">Unduh saldo stok gudang, isi hanya kolom jumlah_fisik, lalu impor kembali. Sistem akan membuat seluruh baris penyesuaian otomatis.</p>
          <AppSelect v-model="defaultAdjustmentAccount" :options="accounts" label="Akun laba/rugi selisih untuk hasil impor" value-type="number" empty-label="Pilih akun" />
          <div class="mt-3 flex flex-wrap gap-2">
            <AppButton type="button" variant="secondary" :disabled="!form.warehouse_id" @click="exportStockCount">Unduh Form Stok Opname</AppButton>
            <AppButton type="button" variant="secondary" :disabled="!form.warehouse_id || !defaultAdjustmentAccount" @click="countFile?.click()">Impor Hasil Hitung</AppButton>
            <input ref="countFile" type="file" accept=".csv,text/csv" class="hidden" @change="importStockCount" />
          </div>
        </div>
        <AppSelect
          v-if="transfer"
          v-model="form.to_warehouse_id"
          :options="warehouses"
          label="Gudang tujuan"
          value-type="number"
          required
        />
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <b>Daftar barang</b>
            <AppButton type="button" variant="secondary" @click="addLine">Tambah baris</AppButton>
          </div>
          <div v-for="(line, index) in form.lines" :key="index" class="grid gap-3 rounded border p-3 md:grid-cols-2">
            <AppSelect v-model="line.item_id" :options="items" :label="`Barang ${index + 1}`" value-type="number" required empty-label="Pilih barang" @update:model-value="loadUnits(line)" />
            <AppSelect v-model="line.unit_id" :options="line.units" label="Satuan" value-type="number" required empty-label="Pilih satuan" />
            <label v-if="transfer">Kuantitas<input v-model.number="line.quantity" type="number" min="0.1" step="0.1" class="field" required /></label>
            <template v-else>
              <p v-if="line.system_quantity !== undefined" class="rounded bg-slate-50 p-2 text-sm">Saldo sistem: <b>{{ new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(line.system_quantity) }}</b> · Selisih: <b>{{ new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(line.actual_quantity - line.system_quantity) }}</b></p>
              <label>Stok aktual hasil hitung<AppNumberInput v-model="line.actual_quantity" :decimals="1" :min="0" required /></label>
              <label>Biaya satuan stok utama<AppNumberInput v-model="line.unit_cost" :decimals="2" :min="0" /></label>
              <AppSelect v-model="line.gain_loss_account_id" :options="accounts" label="Akun laba/rugi selisih" value-type="number" required />
            </template>
            <div class="md:col-span-2 text-right">
              <AppButton v-if="form.lines.length > 1" type="button" variant="secondary" @click="form.lines.splice(index, 1)">Hapus baris</AppButton>
            </div>
          </div>
        </div>
        <label>
          Alasan
          <input v-model="form.reason" class="field" minlength="3" maxlength="255" required />
        </label>
        <label>
          Referensi
          <input v-model="form.reference" class="field" maxlength="100" />
        </label>
      </form>
      <template #footer>
        <AppButton type="submit" form="stock-operation" :loading="busy">
          Simpan &amp; posting
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
