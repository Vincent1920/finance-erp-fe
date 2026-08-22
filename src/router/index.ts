import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { authRoutes } from './routes/auth.routes'
import { appRoutes } from './routes/app.routes'
import { registerRouterGuards } from './guards'
const routes: RouteRecordRaw[] = [
  ...authRoutes,
  appRoutes,
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
registerRouterGuards(router)
export default router
