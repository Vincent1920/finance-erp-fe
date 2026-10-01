<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Columns3 } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string[]
  columns: Array<{ key: string; label: string }>
  storageKey?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const root = ref<HTMLElement | null>(null)
const open = ref(false)

function toggle(key: string) {
  const next = props.modelValue.includes(key)
    ? props.modelValue.filter((item) => item !== key)
    : [...props.modelValue, key]
  if (!next.length) return
  emit('update:modelValue', next)
  if (props.storageKey) localStorage.setItem(props.storageKey, JSON.stringify(next))
}
function close(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}
onMounted(() => {
  document.addEventListener('mousedown', close)
  if (!props.storageKey) return
  try {
    const saved = JSON.parse(localStorage.getItem(props.storageKey) ?? '[]') as string[]
    const valid = saved.filter((key) => props.columns.some((column) => column.key === key))
    if (valid.length) emit('update:modelValue', valid)
  } catch {
    // Invalid browser preference falls back to the supplied defaults.
  }
})
onBeforeUnmount(() => document.removeEventListener('mousedown', close))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Columns3 class="h-4 w-4" />
      Kolom
    </button>
    <div
      v-if="open"
      class="absolute right-0 z-30 mt-2 min-w-52 rounded-xl border bg-white p-2 shadow-xl"
    >
      <p class="px-2 pb-2 text-xs font-semibold uppercase text-slate-500">Tampilkan kolom</p>
      <button
        v-for="column in columns"
        :key="column.key"
        type="button"
        class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
        @click="toggle(column.key)"
      >
        <span>{{ column.label }}</span>
        <Check v-if="modelValue.includes(column.key)" class="h-4 w-4 text-blue-600" />
      </button>
    </div>
  </div>
</template>
