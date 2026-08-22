<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
defineProps<{ page: number; total: number; perPage: number }>()
defineEmits<{ change: [page: number] }>()
</script>
<template>
  <div class="flex items-center justify-between text-sm text-slate-500">
    <span>
      Menampilkan {{ Math.min((page - 1) * perPage + 1, total) }}–{{
        Math.min(page * perPage, total)
      }}
      dari {{ total }}
    </span>
    <div class="flex items-center gap-2">
      <button
        class="rounded-lg border p-2 disabled:opacity-40"
        :disabled="page === 1"
        @click="$emit('change', page - 1)"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <span class="font-medium text-slate-700">
        {{ page }} / {{ Math.ceil(total / perPage) || 1 }}
      </span>
      <button
        class="rounded-lg border p-2 disabled:opacity-40"
        :disabled="page >= Math.ceil(total / perPage)"
        @click="$emit('change', page + 1)"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
