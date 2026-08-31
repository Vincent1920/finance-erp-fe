<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    options: { label: string; value: string | number }[]
    emptyLabel?: string
    required?: boolean
    disabled?: boolean
    error?: string
    valueType?: 'string' | 'number'
  }>(),
  { emptyLabel: 'Semua', required: false, disabled: false, valueType: 'string' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>()

const handleChange = (event: Event) => {
  const raw = (event.target as HTMLSelectElement).value
  if (!raw) {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', props.valueType === 'number' ? Number(raw) : raw)
}
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1.5 block font-medium text-slate-700">
      {{ label }}
      <b v-if="required" class="text-red-500">*</b>
    </span>
    <select
      :value="modelValue"
      class="field"
      :class="error && 'border-red-400'"
      :required="required"
      :disabled="disabled"
      @change="handleChange"
    >
      <option value="">{{ emptyLabel }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
  </label>
</template>
