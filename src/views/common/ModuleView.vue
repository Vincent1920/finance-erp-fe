<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Search, Filter, Download, MoreHorizontal, HardHat } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import { transactions } from '@/data/dummy/transactions'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
const route = useRoute(),
  page = ref(1)
const title = computed(() => String(route.meta.title || 'Modul'))
const description = computed(() =>
  String(
    route.meta.description || `Kelola data ${title.value.toLowerCase()} perusahaan dengan mudah.`,
  ),
)
const isPlaceholder = computed(() => Boolean(route.meta.placeholder))
const rows = computed(() => transactions.slice((page.value - 1) * 8, page.value * 8))
const tone = (s: string) =>
  s === 'Paid' || s === 'Posted' ? 'green' : s === 'Pending Approval' ? 'amber' : 'slate'
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold">{{ title }}</h1>
          <AppBadge v-if="isPlaceholder" tone="amber">Dalam Pengembangan</AppBadge>
        </div>
        <p class="mt-1 text-sm text-slate-500">{{ description }}</p>
      </div>
      <AppButton :icon="Plus">Tambah Baru</AppButton>
    </div>
    <div
      v-if="isPlaceholder"
      class="panel mb-5 flex items-center gap-4 border-amber-200 bg-amber-50/60 p-5"
    >
      <span class="rounded-lg bg-amber-100 p-3 text-amber-700"><HardHat class="h-6 w-6" /></span>
      <div>
        <h2 class="font-semibold">Fondasi modul sudah siap</h2>
        <p class="mt-1 text-sm text-slate-600">
          Route, layout, akses navigasi, pola filter, tabel, dan API layer tersedia. Logika bisnis
          spesifik akan dihubungkan pada tahap integrasi berikutnya.
        </p>
      </div>
    </div>
    <section class="panel overflow-hidden">
      <div class="flex flex-wrap gap-3 border-b p-4">
        <label class="relative min-w-56 flex-1">
          <Search class="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input class="field pl-9" :placeholder="`Cari ${title.toLowerCase()}...`" />
        </label>
        <AppButton variant="secondary" :icon="Filter">Filter</AppButton>
        <AppButton variant="secondary" :icon="Download">Ekspor</AppButton>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th
                v-for="h in [
                  'Tanggal',
                  'Nomor',
                  'Deskripsi / Pihak',
                  'Tipe',
                  'Jumlah',
                  'Status',
                  'Aksi',
                ]"
                :key="h"
                class="px-4 py-3"
              >
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="t in rows" :key="t.id" class="hover:bg-slate-50">
              <td class="px-4 py-3">{{ formatDate(t.date, true) }}</td>
              <td class="px-4 py-3 font-semibold text-blue-700">{{ t.number }}</td>
              <td class="px-4 py-3">{{ t.party }}</td>
              <td class="px-4 py-3 text-slate-500">{{ t.type }}</td>
              <td class="px-4 py-3 font-semibold">{{ formatCurrency(t.amount) }}</td>
              <td class="px-4 py-3">
                <AppBadge :tone="tone(t.status)">{{ t.status }}</AppBadge>
              </td>
              <td class="px-4 py-3">
                <button class="rounded p-2 hover:bg-slate-100">
                  <MoreHorizontal class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="border-t p-4">
        <AppPagination
          :page="page"
          :total="transactions.length"
          :per-page="8"
          @change="page = $event"
        />
      </div>
    </section>
  </div>
</template>
