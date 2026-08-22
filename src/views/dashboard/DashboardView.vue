<script setup lang="ts">
import DashboardSummaryCards from '@/components/dashboard/DashboardSummaryCards.vue'
import DashboardChart from '@/components/dashboard/DashboardChart.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import RecentTransactions from '@/components/dashboard/RecentTransactions.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { metrics, monthly, aging } from '@/data/dummy/dashboard'
import { transactions } from '@/data/dummy/transactions'
const cashFlow = monthly.revenue.map((revenue, index) => revenue - (monthly.expense[index] ?? 0))
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Selamat pagi, Aulia</h1>
        <p class="mt-1 text-sm text-slate-500">
          Ringkasan kinerja keuangan perusahaan per 23 Agustus 2026.
        </p>
      </div>
      <select class="field w-auto">
        <option>Agustus 2026</option>
        <option>Juli 2026</option>
      </select>
    </div>
    <DashboardSummaryCards :metrics="metrics" />
    <QuickActions />
    <div class="mt-5 grid gap-5 xl:grid-cols-2">
      <DashboardChart
        title="Pendapatan vs Beban (Juta Rupiah)"
        :labels="monthly.labels"
        :series="[
          { label: 'Pendapatan', data: monthly.revenue, color: '#2563eb' },
          { label: 'Beban', data: monthly.expense, color: '#f59e0b' },
        ]"
      />
      <DashboardChart
        title="Tren Arus Kas (Juta Rupiah)"
        :labels="monthly.labels"
        :series="[{ label: 'Arus Kas Bersih', data: cashFlow, color: '#10b981' }]"
      />
    </div>
    <div class="mt-5 grid gap-5 xl:grid-cols-3">
      <DashboardChart
        title="Umur Piutang"
        type="bar"
        :labels="['Lancar', '1–30', '31–60', '61–90', '>90']"
        :series="[{ label: 'Piutang', data: aging.receivable, color: '#3b82f6' }]"
      />
      <DashboardChart
        title="Umur Utang"
        type="bar"
        :labels="['Lancar', '1–30', '31–60', '61–90', '>90']"
        :series="[{ label: 'Utang', data: aging.payable, color: '#f59e0b' }]"
      />
      <RecentTransactions :transactions="transactions" />
    </div>
  </div>
</template>
