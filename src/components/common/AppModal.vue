<script setup lang="ts">
import { X } from 'lucide-vue-next'
defineProps<{ open: boolean; title: string }>()
defineEmits<{ close: [] }>()
</script>
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      @click.self="$emit('close')"
    >
      <div class="panel w-full max-w-lg">
        <header class="flex items-center justify-between border-b p-5">
          <h2 class="font-semibold">{{ title }}</h2>
          <button class="rounded-lg p-1 hover:bg-slate-100" @click="$emit('close')">
            <X class="h-5 w-5" />
          </button>
        </header>
        <div class="p-5"><slot /></div>
        <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t p-4">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
