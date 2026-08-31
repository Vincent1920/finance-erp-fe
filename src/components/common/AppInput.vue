<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
  modelValue?: string | number | null
  label?: string
  placeholder?: string
  type?: string
  error?: string
  required?: boolean
  disabled?: boolean
  min?: number
  max?: number
  step?: number
}>(),
  { type: 'text', required: false, disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>()

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  if (props.type !== 'number') {
    emit('update:modelValue', value)
    return
  }
  emit('update:modelValue', value === '' ? null : Number(value))
}
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1.5 block font-medium text-slate-700">
      {{ label }}
      <b v-if="required" class="text-red-500">*</b>
    </span>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :min="min"
      :max="max"
      :step="step"
      v-bind="$attrs"
      class="field"
      :class="error && 'border-red-400'"
      @input="handleInput"
    />
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
  </label>
</template>
