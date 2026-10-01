<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { Check, ChevronDown, Search, X } from 'lucide-vue-next'

let nextId = 0

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | Array<string | number> | null
    label?: string
    options: Array<{ label: string; value: string | number }>
    emptyLabel?: string
    placeholder?: string
    disabled?: boolean
    multiple?: boolean
    resultLabel?: string
    autofocus?: boolean
    required?: boolean
    error?: string
  }>(),
  {
    emptyLabel: 'Semua',
    placeholder: 'Ketik untuk mencari…',
    disabled: false,
    multiple: false,
    resultLabel: 'pilihan',
    autofocus: false,
    required: false,
    error: '',
  },
)
const emit = defineEmits<{
  'update:modelValue': [value: string | number | Array<string | number> | null]
  change: [value: string | number | Array<string | number> | null]
}>()
const componentId = `combobox-${++nextId}`
const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const popup = ref<HTMLElement | null>(null)
const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const popupStyle = ref<CSSProperties>({ visibility: 'hidden' })
const selectedValues = computed(() =>
  Array.isArray(props.modelValue)
    ? props.modelValue
    : props.modelValue == null
      ? []
      : [props.modelValue],
)
const selectedOptions = computed(() =>
  props.options.filter((option) =>
    selectedValues.value.some((value) => String(value) === String(option.value)),
  ),
)
const buttonLabel = computed(() => {
  if (!selectedOptions.value.length) return props.emptyLabel
  if (!props.multiple) return selectedOptions.value[0]?.label ?? props.emptyLabel
  if (selectedOptions.value.length === 1) return selectedOptions.value[0]?.label ?? props.emptyLabel
  return `${selectedOptions.value.length} barang dipilih`
})
const inputValue = computed(() =>
  open.value ? query.value : (selectedOptions.value[0]?.label ?? ''),
)
const isSelected = (value: string | number) =>
  selectedValues.value.some((selected) => String(selected) === String(value))
const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('id-ID')
  if (!needle) return props.options
  return props.options.filter((option) =>
    `${option.label} ${option.value}`.toLocaleLowerCase('id-ID').includes(needle),
  )
})

function positionPopup() {
  if (!open.value || !root.value) return
  const rect = root.value.getBoundingClientRect()
  const viewportPadding = 8
  const width = Math.min(Math.max(rect.width, 320), window.innerWidth - viewportPadding * 2)
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
  )
  const popupHeight = popup.value?.offsetHeight ?? 340
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
  const spaceAbove = rect.top - viewportPadding
  const placeAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow
  const top = placeAbove
    ? Math.max(viewportPadding, rect.top - popupHeight - 4)
    : Math.min(window.innerHeight - viewportPadding, rect.bottom + 4)

  popupStyle.value = {
    position: 'fixed',
    zIndex: 1000,
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    visibility: 'visible',
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-color)',
  }
}

async function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    query.value = ''
    activeIndex.value = 0
    await nextTick()
    positionPopup()
    input.value?.focus()
  }
}
async function focusSingle() {
  if (props.disabled) return
  open.value = true
  query.value = selectedOptions.value[0]?.label ?? ''
  activeIndex.value = 0
  await nextTick()
  positionPopup()
  input.value?.focus()
  input.value?.select()
}
function inputSingle(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  open.value = true
  nextTick(positionPopup)
}
function choose(value: string | number | null) {
  if (!props.multiple) {
    emit('update:modelValue', value)
    emit('change', value)
    open.value = false
    query.value = ''
    return
  }
  if (value === null) {
    emit('update:modelValue', [])
    emit('change', [])
  } else {
    const next = isSelected(value)
      ? selectedValues.value.filter((selected) => String(selected) !== String(value))
      : [...selectedValues.value, value]
    emit('update:modelValue', next)
    emit('change', next)
  }
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(filtered.value.length - 1, 0))
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const match = filtered.value[activeIndex.value] ?? filtered.value[0]
    if (match) choose(match.value)
  }
}
function closeOutside(event: MouseEvent) {
  const target = event.target as Node
  if (!root.value?.contains(target) && !popup.value?.contains(target)) open.value = false
}
watch(filtered, () => {
  activeIndex.value = 0
})
watch(activeIndex, () => {
  nextTick(() =>
    popup.value
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' }),
  )
})
watch(open, (value) => {
  if (value) nextTick(positionPopup)
  else popupStyle.value = { visibility: 'hidden' }
})
onMounted(() => {
  document.addEventListener('mousedown', closeOutside)
  window.addEventListener('resize', positionPopup)
  window.addEventListener('scroll', positionPopup, true)
  if (props.autofocus && !props.multiple) nextTick(() => input.value?.focus())
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', closeOutside)
  window.removeEventListener('resize', positionPopup)
  window.removeEventListener('scroll', positionPopup, true)
})
</script>

<template>
  <div ref="root" class="relative block w-full min-w-0 text-sm">
    <label v-if="label" :for="componentId" class="mb-1.5 block font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-red-600" aria-hidden="true">*</span>
    </label>
    <div v-if="!multiple" class="relative">
      <input
        ref="input"
        :id="componentId"
        :value="inputValue"
        type="search"
        class="field pr-16"
        :disabled="disabled"
        :placeholder="disabled ? emptyLabel : placeholder"
        :autofocus="autofocus"
        :required="required"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${componentId}-error` : undefined"
        :aria-label="label || emptyLabel"
        role="combobox"
        :aria-expanded="open"
        aria-haspopup="listbox"
        autocomplete="off"
        @focus="focusSingle"
        @input="inputSingle"
        @keydown="keydown"
      />
      <span class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
        <X
          v-if="selectedOptions.length"
          class="h-4 w-4 cursor-pointer text-slate-400"
          @mousedown.prevent.stop="choose(null)"
        />
        <ChevronDown class="h-4 w-4 text-slate-400" />
      </span>
    </div>
    <button
      v-else
      type="button"
      class="field flex w-full items-center justify-between gap-3 text-left"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="truncate">{{ buttonLabel }}</span>
      <span class="flex shrink-0 items-center gap-1">
        <X
          v-if="selectedOptions.length"
          class="h-4 w-4 text-slate-400"
          @click.stop="choose(null)"
        />
        <ChevronDown class="h-4 w-4 text-slate-400" />
      </span>
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        ref="popup"
        class="min-w-80 rounded-xl border p-2 text-sm shadow-xl"
        :style="popupStyle"
      >
        <div v-if="multiple" class="relative">
          <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            ref="input"
            v-model="query"
            type="search"
            class="field pl-9"
            :placeholder="placeholder"
            :aria-label="`Cari ${label || 'pilihan'}`"
            @keydown="keydown"
          />
        </div>
        <p class="px-2 py-1.5 text-xs text-slate-500">
          {{ filtered.length }} dari {{ options.length }} {{ resultLabel }}
        </p>
        <div class="max-h-72 overflow-y-auto" role="listbox" :aria-multiselectable="multiple">
          <button
            v-if="multiple"
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-100"
            @click="choose(null)"
          >
            <span>{{ emptyLabel }}</span>
            <Check v-if="!selectedValues.length" class="h-4 w-4 text-blue-600" />
          </button>
          <button
            v-for="(option, index) in filtered"
            :key="option.value"
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-100"
            :class="activeIndex === index && 'bg-slate-100'"
            role="option"
            :aria-selected="isSelected(option.value)"
            :data-active="activeIndex === index"
            @mouseenter="activeIndex = index"
            @click="choose(option.value)"
          >
            <span class="truncate">{{ option.label }}</span>
            <Check v-if="isSelected(option.value)" class="h-4 w-4 shrink-0 text-blue-600" />
          </button>
          <p v-if="!filtered.length" class="px-3 py-6 text-center text-slate-500">
            {{ resultLabel.charAt(0).toLocaleUpperCase('id-ID') + resultLabel.slice(1) }} tidak
            ditemukan.
          </p>
        </div>
      </div>
    </Teleport>
    <p v-if="error" :id="`${componentId}-error`" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
