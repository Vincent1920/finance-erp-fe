import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { authService } from '@/services/auth.service'

import type { User } from '@/types/auth'

import { getApiErrorMessage } from '@/utils/error'

const ACCESS_TOKEN_KEY = 'access_token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref('')

  const isAuthenticated = computed(() => {
    return Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY))
  })

  const login = async (email: string, password: string) => {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const result = await authService.login(email, password)

      sessionStorage.setItem(ACCESS_TOKEN_KEY, result.token)
      localStorage.setItem('finora-auth', 'true')
      user.value = result.user
    } catch (error) {
      errorMessage.value = getApiErrorMessage(error, 'Email atau password tidak valid')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      user.value = null
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.setItem('finora-auth', 'false')
    }
  }

  return {
    user,
    isLoading,
    errorMessage,
    isAuthenticated,
    login,
    logout,
  }
})
