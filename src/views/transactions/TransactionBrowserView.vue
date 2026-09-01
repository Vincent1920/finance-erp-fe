<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import { searchService, type TransactionEntry } from '@/services/search.service'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import { getApiErrorMessage } from '@/utils/error'

const router = useRouter()
const rows = ref<TransactionEntry[]>([]),
  search = ref(''),
  status = ref(''),
  page = ref(1),
  total = ref(0),
  loading = ref(false),
  error = ref('')
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await searchService.transactions({
      page: page.value,
      limit: 20,
      search: search.value || undefined,
      status: status.value || undefined,
    })
    rows.value = response.data
    total.value = response.meta.total
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Transaksi gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const filter = () => {
  page.value = 1
  void load()
}
const changePage = (value: number) => {
  page.value = value
  void load()
}
const path = (row: TransactionEntry) =>
  ({
    sales_invoice: `/sales/invoices/${row.id}`,
    purchase_invoice: `/purchases/invoices/${row.id}`,
    journal: `/accounting/journals/${row.id}`,
    sales_order: `/sales/orders/${row.id}`,
    purchase_order: `/purchases/orders/${row.id}`,
    goods_receipt: `/purchases/receipts/${row.id}`,
  })[row.entity_type]
const tone = (value: string): 'green' | 'amber' | 'red' | 'blue' | 'slate' =>
  ['posted', 'paid', 'completed'].includes(value)
    ? 'green'
    : ['pending_approval', 'approved', 'confirmed'].includes(value)
      ? 'amber'
      : ['cancelled', 'rejected', 'reversed'].includes(value)
        ? 'red'
        : 'slate'
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-6">
      <h1 class="text-2xl font-bold">Browser Transaksi</h1>
      <p class="mt-1 text-sm text-slate-500">
        Telusuri invoice, order, dan jurnal lintas modul dari database.
      </p>
    </header>
    <section class="panel overflow-hidden">
      <div class="grid gap-3 border-b p-4 sm:grid-cols-[1fr_220px]">
        <input
          v-model="search"
          class="field"
          placeholder="Cari DEMO, nomor, pihak, atau tipe"
          @keyup.enter="filter"
        />
        <select v-model="status" class="field" @change="filter">
          <option value="">Semua status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="posted">Posted</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr class="border-b bg-slate-50">
              <th class="p-3">Tanggal</th>
              <th class="p-3">Nomor / Reference</th>
              <th class="p-3">Tipe</th>
              <th class="p-3">Pihak</th>
              <th class="p-3 text-right">Jumlah</th>
              <th class="p-3">Status</th>
              <th class="p-3">Dibuat Oleh</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="`${row.entity_type}-${row.id}`"
              class="cursor-pointer border-b hover:bg-slate-50"
              @click="path(row) && router.push(path(row)!)"
            >
              <td class="p-3">{{ formatDate(row.date, true) }}</td>
              <td class="p-3">
                <b class="text-blue-700">{{ row.number }}</b>
                <small class="block text-slate-400">{{ row.reference }}</small>
              </td>
              <td class="p-3">{{ row.type }}</td>
              <td class="p-3">{{ row.party }}</td>
              <td class="p-3 text-right">{{ formatCurrency(row.amount) }}</td>
              <td class="p-3">
                <AppBadge :tone="tone(row.status)">{{ row.status }}</AppBadge>
              </td>
              <td class="p-3">{{ row.created_by }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState
        v-if="!loading && !rows.length && !error"
        title="Transaksi tidak ditemukan"
        description="Ubah kata pencarian atau status."
      />
      <div class="border-t p-4">
        <AppPagination :page="page" :total="total" :per-page="20" @change="changePage" />
      </div>
    </section>
  </div>
</template>
