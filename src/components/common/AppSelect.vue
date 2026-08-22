<script setup lang="ts">
defineProps<{ modelValue?: string; label?: string; options: { label: string; value: string }[] }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="mb-1.5 block font-medium text-slate-700">{{ label }}</span>
    <select
      :value="modelValue"
      class="field"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">Semua</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
  </label>
</template>
