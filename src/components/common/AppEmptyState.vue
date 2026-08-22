<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
defineProps<{ title?: string; description?: string }>()
</script>
<template>
  <div class="py-14 text-center">
    <Inbox class="mx-auto h-10 w-10 text-slate-300" />
    <h3 class="mt-3 font-semibold">{{ title || 'Belum ada data' }}</h3>
    <p class="mt-1 text-sm text-slate-500">
      {{ description || 'Data akan tampil di sini setelah ditambahkan.' }}
    </p>
  </div>
</template>
