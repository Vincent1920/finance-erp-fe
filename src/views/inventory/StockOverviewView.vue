<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Download, RefreshCw, Search } from 'lucide-vue-next'
import AppBadge from '@/components/common/AppBadge.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import { inventoryService, type StockOverviewRow } from '@/services/inventory.service'
import { warehouseService } from '@/services/warehouse.service'
import { useNotificationStore } from '@/stores/notification.store'
import { getApiErrorMessage } from '@/utils/error'
import { formatCurrency } from '@/utils/currency'

const notifications = useNotificationStore()
const rows = ref<StockOverviewRow[]>([])
const warehouses = ref<Array<{ id: number; label: string }>>([])
const search = ref('')
const warehouseId = ref<number | undefined>()
const status = ref<StockOverviewRow['stock_status'] | undefined>()
const page = ref(1)
const perPage = ref(20)
const total = ref(0)
const isLoading = ref(false)
const errorMessage = ref('')
let searchTimer: ReturnType<typeof setTimeout>

const params = (targetPage = page.value, limit = perPage.value) => ({
  page: targetPage,
  limit,
  search: search.value.trim() || undefined,
  warehouse_id: warehouseId.value,
  status: status.value,
})

const fetchRows = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await inventoryService.overview(params())
    rows.value = response.data
    total.value = response.meta.total
  } catch (error) {
    rows.value = []
    total.value = 0
    errorMessage.value = getApiErrorMessage(error, 'Ringkasan stok gagal dimuat.')
  } finally {
    isLoading.value = false
  }
}

const loadWarehouses = async () => {
  try {
    const response = await warehouseService.list({ page: 1, limit: 500, is_active: true })
    warehouses.value = response.data.map((warehouse) => ({
      id: warehouse.id,
      label: `${warehouse.code} · ${warehouse.name}`,
    }))
  } catch {
    warehouses.value = []
  }
}

const statusLabel = (value: StockOverviewRow['stock_status']) =>
  ({ available: 'Tersedia', low_stock: 'Stok Rendah', out_of_stock: 'Habis' })[value]
const statusTone = (value: StockOverviewRow['stock_status']) =>
  value === 'available' ? 'green' : value === 'low_stock' ? 'amber' : 'red'

const exportCsv = async () => {
  try {
    const first = await inventoryService.overview(params(1, 200))
    const exportRows = [...first.data]
    for (let targetPage = 2; targetPage <= first.meta.totalPages; targetPage += 1) {
      exportRows.push(...(await inventoryService.overview(params(targetPage, 200))).data)
    }
    const csv = [
      'SKU,Item,Gudang,Kuantitas,Biaya Rata-rata,Nilai Persediaan,Status',
      ...exportRows.map((row) =>
        [
          row.sku,
          row.item_name,
          row.warehouse_name,
          row.quantity,
          row.average_cost,
          row.inventory_value,
          statusLabel(row.stock_status),
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      ),
    ].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'ringkasan-stok.csv'
    link.click()
    URL.revokeObjectURL(url)
    notifications.push(`${exportRows.length} baris stok berhasil diekspor.`)
  } catch (error) {
    notifications.push(getApiErrorMessage(error, 'Ekspor stok gagal.'), 'error')
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchRows()
  }, 350)
})
watch([warehouseId, status, perPage], () => {
  page.value = 1
  fetchRows()
})
onMounted(() => Promise.all([loadWarehouses(), fetchRows()]))
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Ringkasan Stok</h1>
        <p class="mt-1 text-sm text-slate-500">Saldo dan valuasi persediaan nyata per item dan gudang.</p>
      </div>
      <AppButton variant="secondary" :icon="Download" :disabled="isLoading" @click="exportCsv">
        Ekspor CSV
      </AppButton>
    </div>
    <section class="panel overflow-hidden">
      <div class="flex flex-wrap gap-3 border-b p-4">
        <label class="relative min-w-56 flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input v-model="search" class="field pl-9" placeholder="Cari SKU, item, atau gudang..." />
        </label>
        <select v-model="warehouseId" class="field w-full sm:w-52">
          <option :value="undefined">Semua gudang</option>
          <option v-for="warehouse in warehouses" :key="warehouse.id" :value="warehouse.id">
            {{ warehouse.label }}
          </option>
        </select>
        <select v-model="status" class="field w-full sm:w-44">
          <option :value="undefined">Semua status</option>
          <option value="available">Tersedia</option>
          <option value="low_stock">Stok Rendah</option>
          <option value="out_of_stock">Habis</option>
        </select>
        <AppButton variant="secondary" :icon="RefreshCw" :loading="isLoading" @click="fetchRows">
          Muat ulang
        </AppButton>
      </div>
      <div v-if="errorMessage" class="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[980px] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3">Item</th><th class="px-4 py-3">Gudang</th>
              <th class="px-4 py-3 text-right">Kuantitas</th><th class="px-4 py-3 text-right">Minimum</th>
              <th class="px-4 py-3 text-right">Biaya Rata-rata</th><th class="px-4 py-3 text-right">Nilai</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody v-if="isLoading" class="divide-y">
            <tr v-for="index in 5" :key="index"><td colspan="7" class="px-4 py-4"><div class="h-5 animate-pulse rounded bg-slate-100" /></td></tr>
          </tbody>
          <tbody v-else class="divide-y">
            <tr v-for="row in rows" :key="row.id" class="hover:bg-slate-50">
              <td class="px-4 py-3"><b class="block font-mono text-blue-700">{{ row.sku }}</b><span>{{ row.item_name }}</span></td>
              <td class="px-4 py-3"><b>{{ row.warehouse_code }}</b><span class="block text-xs text-slate-400">{{ row.warehouse_name }}</span></td>
              <td class="px-4 py-3 text-right tabular-nums">{{ Number(row.quantity).toLocaleString('id-ID') }} {{ row.unit_symbol }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ Number(row.minimum_stock).toLocaleString('id-ID') }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCurrency(Number(row.average_cost)) }}</td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ formatCurrency(Number(row.inventory_value)) }}</td>
              <td class="px-4 py-3"><AppBadge :tone="statusTone(row.stock_status)">{{ statusLabel(row.stock_status) }}</AppBadge></td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState v-if="!isLoading && !rows.length && !errorMessage" title="Belum ada saldo persediaan" description="Saldo akan muncul setelah opening inventory atau transaksi stok diposting." />
      <div class="border-t p-4"><AppPagination :page="page" :total="total" :per-page="perPage" @change="page = $event; fetchRows()" /></div>
    </section>
  </div>
</template>
