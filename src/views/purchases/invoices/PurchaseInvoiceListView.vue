<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Eye, Pencil, Plus, Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { purchaseInvoiceService } from '@/services/purchase-invoice.service'
import { useAuthStore } from '@/stores/auth.store'
import type { PurchaseInvoice, PurchaseInvoiceStatus } from '@/types/purchase'
import { getApiErrorMessage } from '@/utils/error'
const router = useRouter(),
  auth = useAuthStore(),
  rows = ref<PurchaseInvoice[]>([]),
  page = ref(1),
  total = ref(0),
  search = ref(''),
  status = ref(''),
  loading = ref(false),
  error = ref('')
const labels: Record<PurchaseInvoiceStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  posted: 'Posted',
  partially_paid: 'Dibayar Sebagian',
  paid: 'Lunas',
  reversed: 'Reversed',
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
    })
    rows.value = r.data
    total.value = r.meta.total
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Purchase invoice gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const applyFilters = () => {
  page.value = 1
  void load()
}
const changePage = (nextPage: number) => {
  page.value = nextPage
  void load()
}
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
            @keyup.enter="applyFilters"
          />
        </label>
        <select v-model="status" class="field w-52" @change="applyFilters">
          <option value="">Semua status</option>
          <option v-for="(label, key) in labels" :key="key" :value="key">{{ label }}</option>
        </select>
        <AppButton variant="secondary" @click="load">Muat ulang</AppButton>
      </div>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
        <button class="ml-2 underline" @click="load">Coba lagi</button>
      </p>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3">Nomor</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Supplier</th>
              <th class="p-3 text-right">Total</th>
              <th class="p-3 text-right">Outstanding</th>
              <th class="p-3">Status</th>
              <th class="p-3"></th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr><td colspan="7" class="p-8 text-center">Memuat...</td></tr>
          </tbody>
          <tbody v-else class="divide-y">
            <tr v-for="row in rows" :key="row.id">
              <td class="p-3 font-mono font-semibold text-blue-700">
                {{ row.invoice_number }}
                <small class="block text-slate-500">{{ row.supplier_invoice_number }}</small>
              </td>
              <td class="p-3">
                {{ row.invoice_date.slice(0, 10) }}
                <small class="block text-slate-500">
                  Jatuh tempo {{ row.due_date.slice(0, 10) }}
                </small>
              </td>
              <td class="p-3">
                <b>{{ row.supplier_name }}</b>
                <small class="block">{{ row.supplier_code }}</small>
              </td>
              <td class="p-3 text-right">{{ money(row.grand_total, row.currency) }}</td>
              <td class="p-3 text-right font-semibold">
                {{ money(row.outstanding_amount, row.currency) }}
              </td>
              <td class="p-3">
                <AppBadge :tone="tone(row.status)">{{ labels[row.status] }}</AppBadge>
              </td>
              <td class="p-3 text-right">
                <button
                  class="rounded p-2 hover:bg-slate-100"
                  @click="router.push(`/purchases/invoices/${row.id}`)"
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
  </div>
</template>
