<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Eye, Pencil, Plus, RefreshCw, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { salesOrderService } from '@/services/sales-order.service'
import { useAuthStore } from '@/stores/auth.store'
import type { SalesOrder, SalesOrderStatus } from '@/types/sales'
import { getApiErrorMessage } from '@/utils/error'

const router = useRouter()
const auth = useAuthStore()
const rows = ref<SalesOrder[]>([])
const page = ref(1)
const total = ref(0)
const search = ref('')
const status = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

const labels: Record<SalesOrderStatus, string> = {
  draft: 'Draft', confirmed: 'Confirmed', partially_invoiced: 'Sebagian ditagihkan',
  invoiced: 'Invoiced', cancelled: 'Dibatalkan',
}
const tone = (value: SalesOrderStatus) => value === 'confirmed' || value === 'invoiced'
  ? 'green' : value === 'draft' ? 'slate' : value === 'cancelled' ? 'red' : 'amber'
const money = (value: string | number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value))
const date = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))

const load = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await salesOrderService.list({
      page: page.value, limit: 20, search: search.value || undefined, status: status.value || undefined,
    })
    rows.value = response.data
    total.value = response.meta.total
  } catch (error) {
    rows.value = []
    errorMessage.value = getApiErrorMessage(error, 'Sales order gagal dimuat.')
  } finally { isLoading.value = false }
}

watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load() }, 350) })
watch(status, () => { page.value = 1; load() })
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 class="text-2xl font-bold">Sales Order</h1><p class="mt-1 text-sm text-slate-500">Kelola pesanan, konfirmasi, dan penagihan parsial pelanggan.</p></div>
      <AppButton v-if="auth.hasPermission('sales-orders.create')" :icon="Plus" @click="router.push('/sales/orders/new')">Buat Sales Order</AppButton>
    </div>
    <section class="panel overflow-hidden">
      <div class="flex flex-wrap gap-3 border-b p-4">
        <label class="relative min-w-56 flex-1"><Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input v-model="search" class="field pl-9" placeholder="Cari nomor, pelanggan, referensi..." /></label>
        <select v-model="status" class="field w-full sm:w-52"><option value="">Semua status</option><option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option></select>
        <AppButton variant="secondary" :icon="RefreshCw" :loading="isLoading" @click="load">Muat ulang</AppButton>
      </div>
      <div v-if="errorMessage" class="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{{ errorMessage }}</div>
      <div class="overflow-x-auto"><table class="w-full min-w-[940px] text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500"><tr><th class="px-4 py-3">Nomor</th><th class="px-4 py-3">Tanggal</th><th class="px-4 py-3">Pelanggan</th><th class="px-4 py-3">Gudang</th><th class="px-4 py-3 text-right">Total</th><th class="px-4 py-3">Status</th><th class="px-4 py-3 text-right">Aksi</th></tr></thead>
        <tbody v-if="isLoading" class="divide-y"><tr v-for="i in 5" :key="i"><td colspan="7" class="px-4 py-4"><div class="h-5 animate-pulse rounded bg-slate-100" /></td></tr></tbody>
        <tbody v-else class="divide-y"><tr v-for="row in rows" :key="row.id" class="hover:bg-slate-50">
          <td class="px-4 py-3 font-mono font-semibold text-blue-700">{{ row.order_number }}</td><td class="px-4 py-3">{{ date(row.order_date) }}</td><td class="px-4 py-3"><b>{{ row.customer_name }}</b><small class="block text-slate-500">{{ row.customer_code }}</small></td><td class="px-4 py-3">{{ row.warehouse_code }}</td><td class="px-4 py-3 text-right font-semibold">{{ money(row.grand_total) }}</td><td class="px-4 py-3"><AppBadge :tone="tone(row.status)">{{ labels[row.status] }}</AppBadge></td>
          <td class="px-4 py-3"><div class="flex justify-end gap-1"><button class="rounded p-2 hover:bg-slate-100" title="Detail" @click="router.push(`/sales/orders/${row.id}`)"><Eye class="h-4 w-4" /></button><button v-if="row.status === 'draft' && auth.hasPermission('sales-orders.update')" class="rounded p-2 hover:bg-blue-50 hover:text-blue-600" title="Edit" @click="router.push(`/sales/orders/${row.id}/edit`)"><Pencil class="h-4 w-4" /></button></div></td>
        </tr></tbody>
      </table></div>
      <AppEmptyState v-if="!isLoading && !rows.length && !errorMessage" title="Belum ada sales order" description="Buat sales order pertama atau ubah filter pencarian." />
      <div class="border-t p-4"><AppPagination :page="page" :total="total" :per-page="20" @change="page = $event; load()" /></div>
    </section>
  </div>
</template>
