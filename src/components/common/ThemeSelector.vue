<script setup lang="ts">
import { Moon, Sun, Zap } from 'lucide-vue-next'
import { useThemeStore, type Theme } from '@/stores/theme.store'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const themeStore = useThemeStore()
const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'midnight', label: 'Midnight', icon: Zap },
]
</script>

<template>
  <div class="theme-selector" role="group" aria-label="Appearance">
    <span v-if="!compact" class="theme-selector__label">Appearance</span>
    <div class="theme-selector__options">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="theme-selector__button"
        :class="{ 'theme-selector__button--active': themeStore.theme === option.value }"
        :aria-pressed="themeStore.theme === option.value"
        :title="option.label"
        @click="themeStore.setTheme(option.value)"
      >
        <component :is="option.icon" class="h-4 w-4" />
        <span :class="compact ? 'hidden 2xl:inline' : ''">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>
