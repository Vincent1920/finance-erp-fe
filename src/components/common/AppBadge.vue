<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' }>(), {
  tone: 'slate',
})
</script>
<template>
  <span
    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="
      {
        green: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        red: 'bg-red-50 text-red-700',
        blue: 'bg-blue-50 text-blue-700',
        slate: 'bg-slate-100 text-slate-600',
      }[tone]
    "
  >
    <slot />
  </span>
</template>
