<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Download, Printer, CheckCircle2 } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { formatCurrency } from '@/utils/currency'
const route = useRoute()
type ReportSection = [label: string, value: number]

const reportTitles: Record<string, string> = {
  'profit-loss': 'Laporan Laba Rugi',
  'balance-sheet': 'Neraca',
  'cash-flow': 'Laporan Arus Kas',
}

const reportSections: Record<string, ReportSection[]> = {
  'balance-sheet': [
    ['ASET', 0],
    ['Kas dan Bank', 1250000000],
    ['Piutang Usaha', 485750000],
    ['Persediaan', 738200000],
    ['Aset Tetap', 441000000],
    ['Total Aset', 2914950000],
    ['LIABILITAS & EKUITAS', 0],
    ['Utang Usaha', 326400000],
    ['Liabilitas Lainnya', 368550000],
    ['Modal dan Laba Ditahan', 2220000000],
    ['Total Liabilitas & Ekuitas', 2914950000],
  ],
  'cash-flow': [
    ['AKTIVITAS OPERASI', 0],
    ['Penerimaan dari pelanggan', 1420000000],
    ['Pembayaran pemasok & karyawan', -925000000],
    ['Kas Bersih dari Operasi', 495000000],
    ['AKTIVITAS INVESTASI', 0],
    ['Pembelian aset tetap', -120000000],
    ['AKTIVITAS PENDANAAN', 0],
    ['Pembayaran dividen', -50000000],
    ['Kenaikan Bersih Kas', 325000000],
    ['Saldo Kas Akhir', 1250000000],
  ],
  'profit-loss': [
    ['PENDAPATAN', 0],
    ['Penjualan Bersih', 892300000],
    ['Pendapatan Lain', 24500000],
    ['Total Pendapatan', 916800000],
    ['HARGA POKOK PENJUALAN', -514900000],
    ['Laba Kotor', 401900000],
    ['BEBAN OPERASIONAL', 0],
    ['Beban Penjualan', -68400000],
    ['Beban Umum & Administrasi', -92100000],
    ['Laba Sebelum Pajak', 241400000],
    ['Beban Pajak', -23800000],
    ['Laba Bersih', 217600000],
  ],
}

const reportKind = computed(() => String(route.meta.report || 'profit-loss'))
const reportTitle = computed(() => reportTitles[reportKind.value] || 'Laporan Keuangan')
const sections = computed(() => reportSections[reportKind.value] || reportSections['profit-loss'])

const getSectionClass = (label: string, value: number) => {
  if (value === 0) {
    return 'mt-3 bg-slate-50 px-3 text-xs font-bold tracking-widest text-slate-500'
  }

  const isTotal = label.startsWith('Total') || label.includes('Laba') || label.includes('Kas Akhir')

  return isTotal ? 'font-bold' : 'pl-5 text-sm'
}
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ reportTitle }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          Periode yang berakhir 31 Agustus 2026 · PT Finora Indonesia
        </p>
      </div>
      <div class="flex gap-2">
        <AppButton variant="secondary" :icon="Printer">Cetak</AppButton>
        <AppButton :icon="Download">Ekspor</AppButton>
      </div>
    </div>
    <section class="panel mx-auto max-w-4xl p-5 md:p-8">
      <div class="mb-6 flex flex-wrap gap-3">
        <input type="date" value="2026-08-01" class="field w-auto" />
        <input type="date" value="2026-08-31" class="field w-auto" />
        <AppButton variant="secondary">Terapkan</AppButton>
      </div>
      <div class="divide-y">
        <div
          v-for="([label, value], i) in sections"
          :key="i"
          class="flex justify-between gap-4 py-3"
          :class="getSectionClass(label, value)"
        >
          <span>{{ label }}</span>
          <span v-if="value !== 0" class="tabular-nums" :class="value < 0 && 'text-red-600'">
            {{ formatCurrency(value) }}
          </span>
        </div>
      </div>
      <div
        v-if="reportKind === 'balance-sheet'"
        class="mt-6 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
      >
        <CheckCircle2 class="h-5 w-5" />
        Balanced — Aset = Liabilitas + Ekuitas
      </div>
    </section>
  </div>
</template>
