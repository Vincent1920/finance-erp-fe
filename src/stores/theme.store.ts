import { ref } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark' | 'midnight'

export const THEME_STORAGE_KEY = 'finora-theme'
export const THEMES: Theme[] = ['light', 'dark', 'midnight']

const isTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && THEMES.includes(value as Theme)

const systemTheme = (): Theme =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const initialTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return isTheme(stored) ? stored : systemTheme()
}

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.remove(...THEMES)
  document.documentElement.classList.add(theme)
  document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(initialTheme())

  const setTheme = (value: Theme) => {
    theme.value = value
    localStorage.setItem(THEME_STORAGE_KEY, value)
    applyTheme(value)
  }

  applyTheme(theme.value)

  return { theme, setTheme }
})
