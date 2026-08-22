<script setup lang="ts">
import type { Component } from 'vue'
import {
  Wallet,
  CircleArrowDown,
  CircleArrowUp,
  TrendingUp,
  ShoppingCart,
  BadgeDollarSign,
  Boxes,
} from 'lucide-vue-next'
import type { DashboardMetric } from '@/types/accounting'
import { formatCurrency } from '@/utils/currency'
defineProps<{ metric: DashboardMetric }>()
const icons: Record<string, Component> = {
  Wallet,
  CircleArrowDown,
  CircleArrowUp,
  TrendingUp,
  ShoppingCart,
  BadgeDollarSign,
  Boxes,
}
</script>
<template>
  <article class="panel p-5">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500">{{ metric.label }}</p>
        <p class="mt-2 text-xl font-bold tracking-tight">
          {{ formatCurrency(metric.value, true) }}
        </p>
      </div>
      <span
        class="rounded-lg p-2.5"
        :class="
          {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-emerald-50 text-emerald-600',
            amber: 'bg-amber-50 text-amber-600',
            violet: 'bg-violet-50 text-violet-600',
            rose: 'bg-rose-50 text-rose-600',
          }[metric.tone]
        "
      >
        <component :is="icons[metric.icon]" class="h-5 w-5" />
      </span>
    </div>
    <p class="mt-3 text-xs">
      <b :class="metric.change >= 0 ? 'text-emerald-600' : 'text-red-600'">
        {{ metric.change > 0 ? '+' : '' }}{{ metric.change }}%
      </b>
      <span class="text-slate-400">dari bulan lalu</span>
    </p>
  </article>
</template>
