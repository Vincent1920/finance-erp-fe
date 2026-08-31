<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closeDisabled?: boolean
  }>(),
  { size: 'md', closeDisabled: false },
)
const emit = defineEmits<{ close: [] }>()
const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
const handleClose = () => {
  if (!props.closeDisabled) emit('close')
}
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) handleClose()
}
onMounted(() => addEventListener('keydown', handleKeydown))
onUnmounted(() => removeEventListener('keydown', handleKeydown))
</script>
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      @click.self="handleClose"
    >
      <div class="panel max-h-[calc(100vh-2rem)] w-full overflow-y-auto" :class="sizes[size]" role="dialog" aria-modal="true">
        <header class="flex items-center justify-between border-b p-5">
          <h2 class="font-semibold">{{ title }}</h2>
          <button
            type="button"
            class="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-40"
            :disabled="closeDisabled"
            aria-label="Tutup dialog"
            @click="handleClose"
          >
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
