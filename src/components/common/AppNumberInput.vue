<script setup lang="ts">
import { computed, ref, watch } from 'vue'
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ modelValue: number; decimals?: number; min?: number; max?: number; required?: boolean }>(), { decimals: 0, min: undefined, max: undefined, required: false })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const focused = ref(false), draft = ref(''), inputElement = ref<HTMLInputElement | null>(null)
const formatted = computed(() => new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0, maximumFractionDigits: props.decimals,
}).format(Number(props.modelValue || 0)))
watch(() => props.modelValue, (value) => { if (!focused.value) draft.value = formatted.value })
function focus() { focused.value = true; draft.value = String(props.modelValue ?? '').replace('.', ',') }
function validate(value: number) {
  let message = ''
  if (props.min !== undefined && value < props.min) message = `Nilai minimal ${props.min}.`
  if (props.max !== undefined && value > props.max) message = `Nilai maksimal ${props.max}.`
  inputElement.value?.setCustomValidity(message)
}
function input(event: Event) {
  draft.value = (event.target as HTMLInputElement).value
  const normalized = draft.value.replaceAll('.', '').replace(',', '.')
  const value = Number(normalized)
  if (Number.isFinite(value)) { emit('update:modelValue', value); validate(value) }
}
function blur() { focused.value = false; draft.value = formatted.value; validate(Number(props.modelValue || 0)) }
</script>
<template>
  <input ref="inputElement" v-bind="$attrs" :value="focused ? draft : formatted" inputmode="decimal" class="field text-right tabular-nums" :required="required" @focus="focus" @input="input" @blur="blur" />
</template>
