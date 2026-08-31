<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CheckCircle2, Download, Printer, RefreshCw, XCircle } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import {
  reportService,
  type BalanceSheetReport,
  type CashFlowReport,
  type ProfitLossReport,
  type ReportAccountLine,
} from '@/services/report.service'
import { useNotificationStore } from '@/stores/notification.store'
import { getApiErrorMessage } from '@/utils/error'
import { formatCurrency } from '@/utils/currency'

interface ReportLine {
  label: string
  value?: number
  kind?: 'header' | 'total'
}

const route = useRoute()
const notifications = useNotificationStore()
const today = new Date().toISOString().slice(0, 10)
const dateFrom = ref(`${today.slice(0, 8)}01`)
const dateTo = ref(today)
const isLoading = ref(false)
const errorMessage = ref('')
const lines = ref<ReportLine[]>([])
const balanced = ref<boolean | null>(null)
const difference = ref(0)

const reportKind = computed(() => String(route.meta.report || 'profit-loss'))
const reportTitle = computed(
  () =>
    ({
      'profit-loss': 'Laporan Laba Rugi',
      'balance-sheet': 'Neraca',
      'cash-flow': 'Laporan Arus Kas',
    })[reportKind.value] ?? 'Laporan Keuangan',
)

const accountLines = (accounts: ReportAccountLine[], sign = 1): ReportLine[] =>
  accounts.map((account) => ({
    label: `${account.code} · ${account.name}`,
    value: Number(account.amount) * sign,
  }))

const mapProfitLoss = (report: ProfitLossReport): ReportLine[] => [
  { label: 'PENDAPATAN', kind: 'header' },
  ...accountLines(report.sections.revenue?.accounts ?? []),
  { label: 'Total Pendapatan', value: Number(report.sections.revenue?.total ?? 0), kind: 'total' },
  { label: 'HARGA POKOK PENJUALAN', kind: 'header' },
  ...accountLines(report.sections.cogs?.accounts ?? [], -1),
  { label: 'Laba Kotor', value: Number(report.grossProfit), kind: 'total' },
  { label: 'BEBAN OPERASIONAL', kind: 'header' },
  ...accountLines(report.sections.operatingExpenses?.accounts ?? [], -1),
  { label: 'Laba Operasional', value: Number(report.operatingProfit), kind: 'total' },
  { label: 'PENDAPATAN / BEBAN LAIN', kind: 'header' },
  ...accountLines(report.sections.otherIncome?.accounts ?? []),
  ...accountLines(report.sections.otherExpense?.accounts ?? [], -1),
  { label: 'Laba Sebelum Pajak', value: Number(report.profitBeforeTax), kind: 'total' },
  ...accountLines(report.sections.tax?.accounts ?? [], -1),
  { label: 'Laba Bersih', value: Number(report.netProfit), kind: 'total' },
]

const mapBalanceSheet = (report: BalanceSheetReport): ReportLine[] => [
  { label: 'ASET', kind: 'header' },
  ...accountLines(report.sections.assets.accounts),
  { label: 'Total Aset', value: Number(report.assets), kind: 'total' },
  { label: 'LIABILITAS', kind: 'header' },
  ...accountLines(report.sections.liabilities.accounts),
  { label: 'Total Liabilitas', value: Number(report.liabilities), kind: 'total' },
  { label: 'EKUITAS', kind: 'header' },
  ...accountLines(report.sections.equity.accounts),
  { label: 'Laba Tahun Berjalan', value: Number(report.sections.equity.currentYearEarnings) },
  { label: 'Total Ekuitas', value: Number(report.equity), kind: 'total' },
  {
    label: 'Total Liabilitas & Ekuitas',
    value: Number(report.liabilitiesAndEquity),
    kind: 'total',
  },
]

const mapCashFlow = (report: CashFlowReport): ReportLine[] => [
  { label: 'AKTIVITAS OPERASI', kind: 'header' },
  { label: 'Arus Kas Operasi', value: Number(report.activities.operating), kind: 'total' },
  { label: 'AKTIVITAS INVESTASI', kind: 'header' },
  { label: 'Arus Kas Investasi', value: Number(report.activities.investing), kind: 'total' },
  { label: 'AKTIVITAS PENDANAAN', kind: 'header' },
  { label: 'Arus Kas Pendanaan', value: Number(report.activities.financing), kind: 'total' },
  { label: 'Saldo Kas Awal', value: Number(report.openingBalance) },
  { label: 'Perubahan Bersih Kas', value: Number(report.netChange), kind: 'total' },
  { label: 'Saldo Kas Akhir', value: Number(report.endingBalance), kind: 'total' },
]

const fetchReport = async () => {
  isLoading.value = true
  errorMessage.value = ''
  balanced.value = null
  try {
    if (reportKind.value === 'balance-sheet') {
      const report = await reportService.balanceSheet(dateTo.value)
      lines.value = mapBalanceSheet(report)
      balanced.value = report.balanced
      difference.value = Number(report.difference)
    } else if (reportKind.value === 'cash-flow') {
      const report = await reportService.cashFlow(dateFrom.value, dateTo.value)
      lines.value = mapCashFlow(report)
      balanced.value = report.reconciled
      difference.value = Number(report.difference)
    } else {
      lines.value = mapProfitLoss(await reportService.profitLoss(dateFrom.value, dateTo.value))
    }
  } catch (error) {
    lines.value = []
    errorMessage.value = getApiErrorMessage(error, 'Laporan gagal dimuat dari server.')
  } finally {
    isLoading.value = false
  }
}

const exportCsv = () => {
  const csv = [
    'Keterangan,Nilai',
    ...lines.value.map((line) => `"${line.label.replaceAll('"', '""')}",${line.value ?? ''}`),
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${reportKind.value}-${dateTo.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
  notifications.push('Laporan berhasil diekspor.')
}

const printReport = () => window.print()

watch(reportKind, fetchReport)
onMounted(fetchReport)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ reportTitle }}</h1>
        <p class="mt-1 text-sm text-slate-500">Data berasal dari jurnal yang sudah diposting.</p>
      </div>
      <div class="flex gap-2">
        <AppButton variant="secondary" :icon="Printer" :disabled="isLoading" @click="printReport">
          Cetak
        </AppButton>
        <AppButton :icon="Download" :disabled="isLoading || !lines.length" @click="exportCsv">
          Ekspor CSV
        </AppButton>
      </div>
    </div>
    <section class="panel mx-auto max-w-4xl p-5 md:p-8">
      <div class="mb-6 flex flex-wrap gap-3">
        <input v-if="reportKind !== 'balance-sheet'" v-model="dateFrom" type="date" class="field w-auto" />
        <input v-model="dateTo" type="date" class="field w-auto" />
        <AppButton variant="secondary" :icon="RefreshCw" :loading="isLoading" @click="fetchReport">
          Terapkan
        </AppButton>
      </div>
      <div v-if="errorMessage" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <div v-else-if="isLoading" class="space-y-3">
        <div v-for="index in 8" :key="index" class="h-9 animate-pulse rounded bg-slate-100" />
      </div>
      <div v-else-if="lines.length" class="divide-y">
        <div
          v-for="(line, index) in lines"
          :key="`${line.label}-${index}`"
          class="flex justify-between gap-4 py-3"
          :class="{
            'mt-3 bg-slate-50 px-3 text-xs font-bold tracking-widest text-slate-500': line.kind === 'header',
            'font-bold': line.kind === 'total',
            'pl-5 text-sm': !line.kind,
          }"
        >
          <span>{{ line.label }}</span>
          <span v-if="line.value !== undefined" class="tabular-nums" :class="line.value < 0 && 'text-red-600'">
            {{ formatCurrency(line.value) }}
          </span>
        </div>
      </div>
      <p v-else class="py-12 text-center text-sm text-slate-400">Tidak ada data pada periode ini.</p>
      <div
        v-if="balanced !== null && !isLoading && !errorMessage"
        class="mt-6 flex items-center gap-2 rounded-lg p-3 text-sm font-semibold"
        :class="balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
      >
        <CheckCircle2 v-if="balanced" class="h-5 w-5" />
        <XCircle v-else class="h-5 w-5" />
        {{ balanced ? 'Laporan terrekonsiliasi.' : `Selisih laporan: ${formatCurrency(difference)}` }}
      </div>
    </section>
  </div>
</template>
