<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, Download } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import { transactions } from '@/data/dummy/transactions'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'

import type { Transaction } from '@/types/accounting'

const ITEMS_PER_PAGE = 10
const tableHeadings = ['Tanggal', 'Nomor', 'Tipe', 'Pihak', 'Jumlah', 'Status', 'Dibuat Oleh']
const transactionStatuses = ['Draft', 'Pending Approval', 'Posted', 'Paid', 'Cancelled']

const searchQuery = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)

const filteredTransactions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return transactions.filter((transaction) => {
    const matchesStatus = !selectedStatus.value || transaction.status === selectedStatus.value
    const searchableText =
      `${transaction.number} ${transaction.party} ${transaction.type}`.toLowerCase()

    return matchesStatus && searchableText.includes(query)
  })
})

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredTransactions.value.slice(start, start + ITEMS_PER_PAGE)
})

const getStatusTone = (status: Transaction['status']) => {
  if (status === 'Paid' || status === 'Posted') return 'green'
  if (status === 'Pending Approval') return 'amber'
  if (status === 'Cancelled') return 'red'
  return 'slate'
}
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Browser Transaksi</h1>
        <p class="mt-1 text-sm text-slate-500">
          Telusuri seluruh transaksi lintas modul dalam satu tampilan.
        </p>
      </div>
      <AppButton variant="secondary" :icon="Download">Ekspor</AppButton>
    </div>
    <section class="panel overflow-hidden">
      <div class="grid gap-3 border-b p-4 sm:grid-cols-[1fr_220px]">
        <label class="relative">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            v-model="searchQuery"
            class="field pl-9"
            placeholder="Cari nomor, pihak, atau tipe..."
          />
        </label>
        <select v-model="selectedStatus" class="field">
          <option value="">Semua status</option>
          <option v-for="status in transactionStatuses" :key="status">
            {{ status }}
          </option>
        </select>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th v-for="heading in tableHeadings" :key="heading" class="px-4 py-3">
                {{ heading }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="transaction in paginatedTransactions"
              :key="transaction.id"
              class="hover:bg-slate-50"
            >
              <td class="px-4 py-3">{{ formatDate(transaction.date, true) }}</td>
              <td class="px-4 py-3 font-semibold text-blue-700">{{ transaction.number }}</td>
              <td class="px-4 py-3">{{ transaction.type }}</td>
              <td class="px-4 py-3">{{ transaction.party }}</td>
              <td class="px-4 py-3 font-semibold">{{ formatCurrency(transaction.amount) }}</td>
              <td class="px-4 py-3">
                <AppBadge :tone="getStatusTone(transaction.status)">
                  {{ transaction.status }}
                </AppBadge>
              </td>
              <td class="px-4 py-3 text-slate-500">{{ transaction.createdBy }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t p-4">
        <AppPagination
          :page="currentPage"
          :total="filteredTransactions.length"
          :per-page="ITEMS_PER_PAGE"
          @change="currentPage = $event"
        />
      </div>
    </section>
  </div>
</template>
