<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import DashboardChart from '@/components/dashboard/DashboardChart.vue'
import DashboardSummaryCards from '@/components/dashboard/DashboardSummaryCards.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import { dashboardService, type DashboardSummary } from '@/services/dashboard.service'
import { useAuthStore } from '@/stores/auth.store'
import type { DashboardMetric } from '@/types/accounting'
import { formatCurrency } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'

const auth = useAuthStore()
const summary = ref<DashboardSummary | null>(null)
const loading = ref(true)
const error = ref('')
const metrics = computed<DashboardMetric[]>(() => [
  {
    label: 'Saldo Bank',
    value: summary.value?.bankBalance ?? 0,
    change: 0,
    icon: 'Wallet',
    tone: 'blue',
  },
  {
    label: 'Piutang Usaha',
    value: summary.value?.receivables ?? 0,
    change: 0,
    icon: 'CircleArrowDown',
    tone: 'green',
  },
  {
    label: 'Utang Usaha',
    value: summary.value?.payables ?? 0,
    change: 0,
    icon: 'CircleArrowUp',
    tone: 'amber',
  },
  {
    label: 'Nilai Persediaan',
    value: summary.value?.inventoryValue ?? 0,
    change: 0,
    icon: 'Boxes',
    tone: 'violet',
  },
])
const monthLabels = computed(() => summary.value?.monthly.map((entry) => entry.month) ?? [])
const activity = computed(() => [
  {
    label: 'Penjualan',
    data: summary.value?.monthly.map((entry) => entry.sales / 1_000_000) ?? [],
    color: '#2563eb',
  },
  {
    label: 'Pembelian',
    data: summary.value?.monthly.map((entry) => entry.purchases / 1_000_000) ?? [],
    color: '#f59e0b',
  },
])
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    summary.value = await dashboardService.summary()
  } catch (cause) {
    error.value = getApiErrorMessage(cause, 'Ringkasan dashboard gagal dimuat.')
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">
          Selamat datang, {{ auth.user?.name || 'Pengguna' }}
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          Ringkasan posisi Finance ERP berdasarkan transaksi yang tersimpan.
        </p>
      </div>
      <button class="text-sm font-semibold text-blue-700" :disabled="loading" @click="load">
        {{ error ? 'Coba lagi' : 'Muat ulang' }}
      </button>
    </header>
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <DashboardSummaryCards :metrics="metrics" />
    <QuickActions />
    <div class="mt-5 grid gap-5 xl:grid-cols-3">
      <DashboardChart
        class="xl:col-span-2"
        title="Penjualan vs Pembelian (Juta Rupiah)"
        :labels="monthLabels"
        :series="activity"
      />
      <section class="panel p-5">
        <h2 class="font-semibold">Volume Data</h2>
        <dl class="mt-4 space-y-4">
          <div class="flex justify-between border-b pb-3">
            <dt>Pelanggan</dt>
            <dd class="font-bold">{{ summary?.customers ?? 0 }}</dd>
          </div>
          <div class="flex justify-between border-b pb-3">
            <dt>Supplier</dt>
            <dd class="font-bold">{{ summary?.suppliers ?? 0 }}</dd>
          </div>
          <div class="flex justify-between border-b pb-3">
            <dt>Item</dt>
            <dd class="font-bold">{{ summary?.items ?? 0 }}</dd>
          </div>
          <div class="flex justify-between">
            <dt>Jurnal posted</dt>
            <dd class="font-bold">{{ summary?.postedJournals ?? 0 }}</dd>
          </div>
        </dl>
      </section>
    </div>
    <section class="panel mt-5 overflow-hidden">
      <header class="border-b p-5"><h2 class="font-semibold">Jurnal Terbaru</h2></header>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-slate-50 text-left">
              <th class="p-3">Nomor</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Deskripsi</th>
              <th class="p-3 text-right">Nilai</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="journal in summary?.recentJournals" :key="journal.id" class="border-b">
              <td class="p-3">
                <RouterLink
                  class="font-medium text-blue-700"
                  :to="`/accounting/journals/${journal.id}`"
                >
                  {{ journal.number }}
                </RouterLink>
              </td>
              <td class="p-3">{{ journal.date }}</td>
              <td class="p-3">{{ journal.description }}</td>
              <td class="p-3 text-right">{{ formatCurrency(journal.amount, true) }}</td>
              <td class="p-3">
                <AppBadge tone="blue">{{ journal.status }}</AppBadge>
              </td>
            </tr>
            <tr v-if="!summary?.recentJournals.length">
              <td colspan="5" class="p-8 text-center text-slate-500">Belum ada jurnal.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
