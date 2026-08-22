<script setup lang="ts">
import type { Component } from 'vue'
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    loading?: boolean
    disabled?: boolean
    icon?: Component
  }>(),
  { variant: 'primary' },
)
defineEmits<{ click: [event: MouseEvent] }>()
</script>
<template>
  <button
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="
      {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'text-slate-600 hover:bg-slate-100',
      }[variant]
    "
    @click="$emit('click', $event)"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    <component :is="icon" v-else-if="icon" class="h-4 w-4" />
    <slot />
  </button>
</template>
