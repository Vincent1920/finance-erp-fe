import type { Router } from 'vue-router'
const TOKEN_KEY = 'access_token'
export function registerRouterGuards(router: Router) {
  router.beforeEach((to) => {
    document.title = `${String(to.meta.title || 'Finance ERP')} · Finora`
    const authenticated = Boolean(sessionStorage.getItem(TOKEN_KEY))
    if (to.meta.requiresAuth && !authenticated)
      return { path: '/login', query: { redirect: to.fullPath } }
    if (to.path === '/login' && authenticated) return '/dashboard'
    return true
  })
}
