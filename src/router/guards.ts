import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

export function registerRouterGuards(
  router: Router,
) {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    document.title = `${String(to.meta.title || 'Finance ERP')} · Finora`

    const requiresAuth =
      to.meta.requiresAuth !== false

    // Route publik, termasuk /login.
    if (!requiresAuth) {
      if (
        to.path === '/login' &&
        authStore.isAuthenticated
      ) {
        return '/dashboard'
      }

      return true
    }

    // Restore session hanya diperlukan untuk route private. Route publik
    // (khususnya /login) tetap dapat dirender ketika API sedang offline.
    if (!authStore.isInitialized) {
      await authStore.bootstrap()
    }

    // Route private tetapi token tidak ada.
    if (!authStore.isAuthenticated) {
      return {
        path: '/login',
        query: {
          redirect: to.fullPath,
        },
      }
    }

    // Satu role super-admin = akses penuh.
    if (authStore.isSuperAdmin) {
      return true
    }

    const requiredRole =
      to.meta.role as string | undefined

    if (
      requiredRole &&
      !authStore.hasRole(requiredRole)
    ) {
      return {
        path: '/forbidden',
        query: {
          from: to.fullPath,
        },
      }
    }

    const requiredPermission =
      to.meta.permission as string | undefined

    if (
      requiredPermission &&
      !authStore.hasPermission(requiredPermission)
    ) {
      return {
        path: '/forbidden',
        query: {
          from: to.fullPath,
        },
      }
    }

    const requiredPermissions = to.meta.permissions

    if (
      requiredPermissions?.length &&
      !requiredPermissions.some((permission) => authStore.hasPermission(permission))
    ) {
      return {
        path: '/forbidden',
        query: {
          from: to.fullPath,
        },
      }
    }

    return true
  })
}
