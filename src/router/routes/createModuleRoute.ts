import type { RouteRecordRaw } from 'vue-router'

export const createModuleRoute = (
  path: string,
  title: string,
  placeholder = false,
): RouteRecordRaw => {
  return {
    path,
    name: path.replaceAll('/', '-'),
    component: () => import('@/views/common/ModuleView.vue'),
    meta: {
      title,
      placeholder,
      requiresAuth: true,
    },
  }
}
