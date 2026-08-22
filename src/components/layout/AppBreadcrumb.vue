<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronRight, Home } from 'lucide-vue-next'
const route = useRoute()
const crumbs = computed(() =>
  route.path
    .split('/')
    .filter(Boolean)
    .map((x: string, i: number, a: string[]) => ({
      label: x.replaceAll('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      to: '/' + a.slice(0, i + 1).join('/'),
    })),
)
</script>
<template>
  <nav class="mb-3 flex items-center gap-1 text-xs text-slate-400">
    <RouterLink to="/dashboard"><Home class="h-3.5 w-3.5" /></RouterLink>
    <template v-for="c in crumbs" :key="c.to">
      <ChevronRight class="h-3 w-3" />
      <span>{{ c.label }}</span>
    </template>
  </nav>
</template>
