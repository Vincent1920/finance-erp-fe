import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  authService,
  type AuthenticatedUser,
} from '@/services/auth.service'

import {
  getStoredToken,
  removeStoredToken,
} from '@/utils/auth-storage'

import { getLoginErrorMessage } from '@/utils/error'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getStoredToken())
  const user = ref<AuthenticatedUser | null>(null)

  const isLoading = ref(false)
  const isInitialized = ref(false)
  const errorMessage = ref('')

  let bootstrapRequest: Promise<void> | null = null

  const isAuthenticated = computed(() => {
    return Boolean(token.value)
  })

  const roles = computed(() => {
    return user.value?.roles ?? []
  })

  const permissions = computed(() => {
    return user.value?.permissions ?? []
  })

  const isSuperAdmin = computed(() => {
    return roles.value.includes('super-admin')
  })

  const clearError = () => {
    errorMessage.value = ''
  }

  const hasRole = (role?: string) => {
    if (!role) return true
    if (isSuperAdmin.value) return true

    return roles.value.includes(role)
  }

  const hasPermission = (permission?: string) => {
    if (!permission) return true
    if (isSuperAdmin.value) return true

    return (
      permissions.value.includes('*') ||
      permissions.value.includes(permission)
    )
  }

  const login = async (
    email: string,
    password: string,
    remember = true,
  ) => {
    isLoading.value = true
    clearError()

    try {
      const result = await authService.login(
        email,
        password,
        remember,
      )

      token.value = result.token
      user.value = result.user

      // Sangat penting:
      // user + role + permission sudah tersedia sebelum router
      // mencoba membuka dashboard.
      isInitialized.value = true

      return result
    } catch (error) {
      errorMessage.value = getLoginErrorMessage(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const bootstrap = async () => {
    if (isInitialized.value) {
      return
    }

    if (bootstrapRequest) {
      return bootstrapRequest
    }

    bootstrapRequest = (async () => {
      const storedToken = getStoredToken()

      if (!storedToken) {
        token.value = null
        user.value = null
        isInitialized.value = true
        return
      }

      token.value = storedToken

      try {
        // Restore user + roles + permissions setelah browser refresh.
        user.value = await authService.me()
      } catch {
        removeStoredToken()

        token.value = null
        user.value = null
      } finally {
        isInitialized.value = true
      }
    })()

    try {
      await bootstrapRequest
    } finally {
      bootstrapRequest = null
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      removeStoredToken()

      token.value = null
      user.value = null
      isInitialized.value = true
      clearError()
    }
  }

  return {
    token,
    user,

    roles,
    permissions,

    isLoading,
    isInitialized,
    isAuthenticated,
    isSuperAdmin,
    errorMessage,

    clearError,
    hasRole,
    hasPermission,

    bootstrap,
    login,
    logout,
  }
})
