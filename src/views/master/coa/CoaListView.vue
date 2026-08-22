<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, Plus, Pencil, Trash2, Search } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import { accounts } from '@/data/dummy/coa'
import { formatCurrency } from '@/utils/currency'
const ITEMS_PER_PAGE = 8

const searchQuery = ref('')
const selectedAccountType = ref('')
const currentPage = ref(1)
const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const
const indentClasses = ['pl-4', 'pl-9', 'pl-14', 'pl-20'] as const
const getIndentClass = (level: number) => {
  return indentClasses[Math.min(level, indentClasses.length - 1)]
}

const filteredAccounts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return accounts.filter((account) => {
    const matchesType = !selectedAccountType.value || account.type === selectedAccountType.value
    const searchableText = `${account.code} ${account.name}`.toLowerCase()
    const matchesSearch = searchableText.includes(query)

    return matchesType && matchesSearch
  })
})

const paginatedAccounts = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE

  return filteredAccounts.value.slice(start, end)
})

const handleExportCsv = () => {
  const header = ['Kode', 'Nama', 'Tipe', 'Saldo']
  const dataRows = filteredAccounts.value.map((account) => [
    account.code,
    account.name,
    account.type,
    String(account.balance),
  ])
  const csvContent = [header, ...dataRows].map((row) => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const downloadUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')

  downloadLink.href = downloadUrl
  downloadLink.download = 'chart-of-accounts.csv'
  downloadLink.click()
  URL.revokeObjectURL(downloadUrl)
}
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Chart of Accounts</h1>
        <p class="mt-1 text-sm text-slate-500">
          Kelola struktur akun dan saldo buku besar perusahaan.
        </p>
      </div>
      <div class="flex gap-2">
        <AppButton variant="secondary" :icon="Download" @click="handleExportCsv">
          Ekspor CSV
        </AppButton>
        <AppButton :icon="Plus">Tambah Akun</AppButton>
      </div>
    </div>
    <section class="panel overflow-hidden">
      <div class="flex flex-wrap gap-3 border-b p-4">
        <label class="relative min-w-60 flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            v-model="searchQuery"
            class="field pl-9"
            placeholder="Cari kode atau nama akun..."
          />
        </label>
        <select v-model="selectedAccountType" class="field w-48">
          <option value="">Semua tipe akun</option>
          <option v-for="accountType in accountTypes" :key="accountType">{{ accountType }}</option>
        </select>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1100px] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3">Kode</th>
              <th class="px-4 py-3">Nama Akun</th>
              <th class="px-4 py-3">Tipe</th>
              <th
                v-for="heading in ['Saldo Awal', 'Debit', 'Kredit', 'Saldo']"
                :key="heading"
                class="px-4 py-3 text-right"
              >
                {{ heading }}
              </th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="account in paginatedAccounts" :key="account.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-mono font-semibold text-blue-700">{{ account.code }}</td>
              <td class="py-3 pr-4 font-medium" :class="getIndentClass(account.level)">
                <span v-if="account.level" class="mr-2 text-slate-300">└</span>
                {{ account.name }}
              </td>
              <td class="px-4 py-3 text-slate-500">{{ account.type }}</td>
              <td
                v-for="amount in [
                  account.openingBalance,
                  account.debit,
                  account.credit,
                  account.balance,
                ]"
                :key="amount"
                class="px-4 py-3 text-right tabular-nums"
              >
                {{ formatCurrency(amount) }}
              </td>
              <td class="px-4 py-3"><AppBadge tone="green">Aktif</AppBadge></td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  <button class="rounded p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button class="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t p-4">
        <AppPagination
          :page="currentPage"
          :total="filteredAccounts.length"
          :per-page="ITEMS_PER_PAGE"
          @change="currentPage = $event"
        />
      </div>
    </section>
  </div>
</template>
