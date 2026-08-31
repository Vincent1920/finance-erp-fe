<script setup lang="ts">
import { CircleCheck, CircleX, Rows3, TriangleAlert } from 'lucide-vue-next'
import type { Component } from 'vue'
import type { ImportJob } from '@/types/data-import'

defineProps<{ job: ImportJob }>()

interface SummaryCard {
  key: 'totalRows' | 'validRows' | 'warningRows' | 'errorRows'
  label: string
  icon: Component
  iconClass: string
  panelClass: string
}

const cards: SummaryCard[] = [
  {
    key: 'totalRows',
    label: 'Total baris',
    icon: Rows3,
    iconClass: 'bg-blue-100 text-blue-700',
    panelClass: 'border-blue-100',
  },
  {
    key: 'validRows',
    label: 'Valid',
    icon: CircleCheck,
    iconClass: 'bg-emerald-100 text-emerald-700',
    panelClass: 'border-emerald-100',
  },
  {
    key: 'warningRows',
    label: 'Peringatan',
    icon: TriangleAlert,
    iconClass: 'bg-amber-100 text-amber-700',
    panelClass: 'border-amber-100',
  },
  {
    key: 'errorRows',
    label: 'Error',
    icon: CircleX,
    iconClass: 'bg-red-100 text-red-700',
    panelClass: 'border-red-100',
  },
]
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <article
      v-for="card in cards"
      :key="card.key"
      class="rounded-xl border bg-white p-4"
      :class="card.panelClass"
    >
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl" :class="card.iconClass">
          <component :is="card.icon" class="h-5 w-5" />
        </span>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {{ card.label }}
          </p>
          <p class="mt-0.5 text-2xl font-bold tabular-nums">
            {{ job[card.key].toLocaleString('id-ID') }}
          </p>
        </div>
      </div>
    </article>
  </div>
</template>
