<script setup lang="ts">
import AppCombobox from './AppCombobox.vue'
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
const handleChange = (raw: string | number | Array<string | number> | null) => {
  if (raw === null || Array.isArray(raw) || raw === '') {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', props.valueType === 'number' ? Number(raw) : raw)
}
</script>
<template>
  <AppCombobox
    :model-value="modelValue"
    :label="label"
    :options="options"
    :empty-label="emptyLabel"
    :placeholder="`Ketik kode atau nama ${label?.toLocaleLowerCase() || 'pilihan'}…`"
    :disabled="disabled"
    :required="required"
    :error="error"
    result-label="pilihan"
    @update:model-value="handleChange"
  />
</template>
