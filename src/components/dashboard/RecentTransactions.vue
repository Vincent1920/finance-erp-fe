<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import AppBadge from '@/components/common/AppBadge.vue'
import type { Transaction } from '@/types/accounting'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
defineProps<{ transactions: Transaction[] }>()
const tone = (status: Transaction['status']) =>
  status === 'Paid' || status === 'Posted'
    ? 'green'
    : status === 'Pending Approval'
      ? 'amber'
      : 'slate'
</script>
<template>
  <section class="panel overflow-hidden">
    <header class="flex items-center justify-between border-b p-5">
      <h2 class="font-semibold">Transaksi Terbaru</h2>
      <RouterLink
        to="/transactions"
        class="flex items-center gap-1 text-sm font-semibold text-blue-600"
      >
        Lihat semua
        <ArrowRight class="h-4 w-4" />
      </RouterLink>
    </header>
    <div class="divide-y">
      <div
        v-for="transaction in transactions.slice(0, 6)"
        :key="transaction.id"
        class="flex items-center justify-between gap-3 p-4"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{{ transaction.party }}</p>
          <p class="text-xs text-slate-400">
            {{ transaction.number }} · {{ formatDate(transaction.date, true) }}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-sm font-semibold">{{ formatCurrency(transaction.amount, true) }}</p>
          <AppBadge :tone="tone(transaction.status)">{{ transaction.status }}</AppBadge>
        </div>
      </div>
    </div>
  </section>
</template>
