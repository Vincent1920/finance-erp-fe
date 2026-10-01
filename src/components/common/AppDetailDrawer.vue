<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{ open: boolean; title: string; subtitle?: string }>()
const emit = defineEmits<{ close: [] }>()
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
      @mousedown.self="emit('close')"
    >
      <aside
        class="h-full w-full max-w-md overflow-y-auto border-l bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header
          class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-white p-5"
        >
          <div>
            <h2 class="text-lg font-bold">{{ title }}</h2>
            <p v-if="subtitle" class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 hover:bg-slate-100"
            aria-label="Tutup ringkasan"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </header>
        <div class="p-5"><slot /></div>
        <footer v-if="$slots.footer" class="sticky bottom-0 border-t bg-white p-4">
          <slot name="footer" />
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
