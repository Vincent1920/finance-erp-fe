<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HardHat } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppBadge from '@/components/common/AppBadge.vue'
const route = useRoute()
const title = computed(() => String(route.meta.title || 'Modul'))
const description = computed(() =>
  String(
    route.meta.description || `Kelola data ${title.value.toLowerCase()} perusahaan dengan mudah.`,
  ),
)
const isPlaceholder = computed(() => Boolean(route.meta.placeholder))
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
  </div>
</template>
