<script setup lang="ts">
defineProps<{
  modelValue?: string | number
  label?: string
  placeholder?: string
  type?: string
  error?: string
  required?: boolean
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1.5 block font-medium text-slate-700">
      {{ label }}
      <b v-if="required" class="text-red-500">*</b>
    </span>
    <input
      :value="modelValue"
      :type="type || 'text'"
      :placeholder="placeholder"
      class="field"
      :class="error && 'border-red-400'"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="mt-1 block text-xs text-red-600">{{ error }}</span>
  </label>
</template>
