<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Eye, Pencil, Plus, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { purchaseOrderService } from '@/services/purchase-order.service'
import { useAuthStore } from '@/stores/auth.store'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/purchase'
import { getApiErrorMessage } from '@/utils/error'
const router = useRouter(),
  auth = useAuthStore(),
  rows = ref<PurchaseOrder[]>([]),
  page = ref(1),
  total = ref(0),
  search = ref(''),
  status = ref(''),
  loading = ref(false),
  error = ref('')
const labels: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Dikonfirmasi',
  partially_received: 'Diterima Sebagian',
  partially_billed: 'Ditagih Sebagian',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}
const tone = (s: PurchaseOrderStatus): 'green' | 'amber' | 'red' | 'blue' | 'slate' =>
  s === 'completed'
    ? 'green'
    : s === 'confirmed'
      ? 'blue'
      : s.startsWith('partially')
        ? 'amber'
        : s === 'cancelled'
          ? 'red'
          : 'slate'
const money = (v: string | number, c = 'IDR') =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 2,
  }).format(Number(v))
const date = (v: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(`${v.slice(0, 10)}T00:00:00`),
  )
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const r = await purchaseOrderService.list({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
      status: status.value || undefined,
    })
    rows.value = r.data
    total.value = r.meta.total
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Purchase order gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const changePage = (v: number) => {
  page.value = v
  void load()
}
let timer: number | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = window.setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
watch(status, () => {
  page.value = 1
  load()
})
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Purchase Order</h1>
        <p class="text-sm text-slate-500">
          Kelola pesanan pemasok, penerimaan, dan penagihan pembelian.
        </p>
      </div>
      <AppButton
        v-if="auth.hasPermission('purchase-orders.create')"
        :icon="Plus"
        @click="router.push('/purchases/orders/new')"
      >
        Buat Purchase Order
      </AppButton>
    </div>
    <section class="panel overflow-hidden">
      <div class="flex gap-3 border-b p-4">
        <label class="relative flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            v-model="search"
            class="field pl-9"
            placeholder="Cari nomor, pemasok, referensi..."
          />
        </label>
        <select v-model="status" class="field max-w-56">
          <option value="">Semua status</option>
          <option v-for="(v, k) in labels" :key="k" :value="k">{{ v }}</option>
        </select>
      </div>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3">Nomor</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Pemasok</th>
              <th class="p-3">Gudang</th>
              <th class="p-3 text-right">Total</th>
              <th class="p-3">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i">
              <td colspan="7" class="p-4">
                <div class="h-5 animate-pulse rounded bg-slate-100" />
              </td>
            </tr>
          </tbody>
          <tbody v-else class="divide-y">
            <tr v-for="row in rows" :key="row.id">
              <td class="p-3 font-mono font-semibold text-blue-700">{{ row.order_number }}</td>
              <td class="p-3">{{ date(row.order_date) }}</td>
              <td class="p-3">
                <b>{{ row.supplier_name }}</b>
                <small class="block text-slate-500">{{ row.supplier_code }}</small>
              </td>
              <td class="p-3">{{ row.warehouse_code }}</td>
              <td class="p-3 text-right font-semibold">
                {{ money(row.grand_total, row.currency) }}
              </td>
              <td class="p-3">
                <AppBadge :tone="tone(row.status)">{{ labels[row.status] }}</AppBadge>
              </td>
              <td class="p-3">
                <div class="flex justify-end">
                  <button
                    class="rounded p-2 hover:bg-slate-100"
                    @click="router.push(`/purchases/orders/${row.id}`)"
                  >
                    <Eye class="h-4 w-4" />
                  </button>
                  <button
                    v-if="row.status === 'draft' && auth.hasPermission('purchase-orders.update')"
                    class="rounded p-2 hover:bg-slate-100"
                    @click="router.push(`/purchases/orders/${row.id}/edit`)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState
        v-if="!loading && !rows.length && !error"
        title="Belum ada purchase order"
        description="Buat purchase order pertama atau ubah filter."
      />
      <div class="border-t p-4">
        <AppPagination :page="page" :total="total" :per-page="20" @change="changePage" />
      </div>
    </section>
  </div>
</template>
