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
import { ChevronRight } from 'lucide-vue-next'

const auth = useAuthStore()
const summary = ref<DashboardSummary | null>(null)
const loading = ref(true)
const error = ref('')
const metrics = computed<DashboardMetric[]>(() => {
  const available: DashboardMetric[] = [
  {
    label: 'Saldo Bank',
    value: summary.value?.bankBalance ?? 0,
    change: null,
    icon: 'Wallet',
    tone: 'blue',
  },
  {
    label: 'Piutang Usaha',
    value: summary.value?.receivables ?? 0,
    change: null,
    icon: 'CircleArrowDown',
    tone: 'green',
  },
  {
    label: 'Utang Usaha',
    value: summary.value?.payables ?? 0,
    change: null,
    icon: 'CircleArrowUp',
    tone: 'amber',
  },
  {
    label: 'Nilai Persediaan',
    value: summary.value?.inventoryValue ?? 0,
    change: null,
    icon: 'Boxes',
    tone: 'violet',
  }]
  return available.filter((metric) => {
  const permission: Record<string, string> = {
    'Saldo Bank': 'banking.view', 'Piutang Usaha': 'receivables.view',
    'Utang Usaha': 'payables.view', 'Nilai Persediaan': 'inventory.view',
  }
    return auth.hasPermission(permission[metric.label])
  })
})
const dashboardRole = computed(() => {
  if (auth.isSuperAdmin) return 'Ringkasan menyeluruh perusahaan'
  if (auth.hasPermission('accounting.close_period')) return 'Fokus keuangan dan penutupan periode'
  if (auth.hasPermission('tax-reconciliation.view')) return 'Fokus kepatuhan dan rekonsiliasi pajak'
  if (auth.hasPermission('payroll.view')) return 'Fokus payroll dan kewajiban pegawai'
  if (auth.hasPermission('inventory.view')) return 'Fokus persediaan dan pergerakan stok'
  if (auth.hasPermission('sales-invoices.view')) return 'Fokus penjualan dan penagihan'
  if (auth.hasPermission('purchase-invoices.view')) return 'Fokus pembelian dan pembayaran pemasok'
  return 'Ringkasan pekerjaan sesuai hak akses Anda'
})
const canSeeFinancialChart = computed(() => auth.hasPermission('reports.view') || auth.hasPermission('sales-invoices.view') || auth.hasPermission('purchase-invoices.view'))
const canSeeJournals = computed(() => auth.hasPermission('journals.view'))
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
const workItems = computed(() => {
  const queue = summary.value?.workQueue
  if (!queue) return []
  return [
    { label: 'Invoice penjualan terlambat', count: queue.overdueInvoices, to: '/sales/receivables', permission: 'receivables.view', tone: 'red', help: 'Perlu ditagih atau dijadwalkan pembayarannya.' },
    { label: 'Piutang jatuh tempo 7 hari', count: queue.receivablesDueThisWeek, to: '/reports/receivable-aging', permission: 'reports.view', tone: 'amber', help: 'Siapkan tindak lanjut sebelum melewati jatuh tempo.' },
    { label: 'Utang jatuh tempo 7 hari', count: queue.payablesDueThisWeek, to: '/reports/payable-aging', permission: 'reports.view', tone: 'amber', help: 'Pastikan kas dan jadwal pembayaran tersedia.' },
    { label: 'Menunggu persetujuan', count: queue.pendingApprovals, to: '/approvals', permission: 'approvals.view', tone: 'blue', help: 'Dokumen belum dapat diposting sebelum disetujui.' },
    { label: 'Mutasi bank belum cocok', count: queue.unmatchedBankLines, to: '/banking/reconciliation', permission: 'banking.view', tone: 'red', help: 'Cocokkan mutasi dengan jurnal atau tandai pengecualian.' },
    { label: 'Periode pajak masih terbuka', count: queue.openTaxPeriods, to: '/tax/reconciliation', permission: 'tax-reconciliation.view', tone: 'amber', help: 'Periksa selisih sebelum periode dikunci.' },
    { label: 'Barang di bawah stok minimum', count: queue.lowStockItems, to: '/inventory/stock', permission: 'inventory.view', tone: 'red', help: 'Pertimbangkan pembelian atau transfer stok.' },
    { label: 'Payroll bulan ini belum dikunci', count: queue.unfinishedPayroll, to: '/payroll', permission: 'payroll.view', tone: 'blue', help: 'Lanjutkan hitung, persetujuan, posting, atau pembayaran.' },
    { label: 'Periode perlu ditutup', count: queue.periodsToClose, to: '/accounting/closing', permission: 'accounting.close_period', tone: 'amber', help: 'Selesaikan pemeriksaan sebelum tutup periode.' },
  ].filter((item) => auth.hasPermission(item.permission))
})
const attentionCount = computed(() => workItems.value.reduce((total, item) => total + item.count, 0))
const statusLabel: Record<string, string> = { draft: 'Draft', pending_approval: 'Menunggu Persetujuan', approved: 'Disetujui', posted: 'Diposting', reversed: 'Dibalik', cancelled: 'Dibatalkan' }
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
          {{ dashboardRole }}.
        </p>
      </div>
      <button class="text-sm font-semibold text-blue-700" :disabled="loading" @click="load">
        {{ error ? 'Coba lagi' : 'Muat ulang' }}
      </button>
    </header>
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <DashboardSummaryCards :metrics="metrics" />
    <section class="panel mt-5 overflow-hidden">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div><h2 class="font-semibold">Pusat Pekerjaan</h2><p class="mt-1 text-sm text-slate-500">Hal yang perlu diperiksa atau diselesaikan hari ini.</p></div>
        <AppBadge :tone="attentionCount ? 'amber' : 'green'">{{ attentionCount ? `${attentionCount} perlu tindakan` : 'Tidak ada pekerjaan tertunda' }}</AppBadge>
      </header>
      <div class="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-3">
        <RouterLink v-for="item in workItems" :key="item.label" :to="item.to" class="group flex min-h-28 items-start gap-3 bg-white p-4 hover:bg-slate-50">
          <span class="grid h-10 min-w-10 place-items-center rounded-xl text-lg font-bold" :class="{ red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700' }[item.tone]">{{ item.count }}</span>
          <span class="min-w-0 flex-1"><b class="block text-sm">{{ item.label }}</b><small class="mt-1 block leading-5 text-slate-500">{{ item.count ? item.help : 'Tidak ada data yang memerlukan tindakan.' }}</small></span>
          <ChevronRight class="mt-2 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
        </RouterLink>
      </div>
    </section>
    <QuickActions />
    <div v-if="canSeeFinancialChart" class="mt-5 grid gap-5 xl:grid-cols-3">
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
    <section v-if="canSeeJournals" class="panel mt-5 overflow-hidden">
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
                <AppBadge tone="blue">{{ statusLabel[journal.status] ?? journal.status }}</AppBadge>
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
