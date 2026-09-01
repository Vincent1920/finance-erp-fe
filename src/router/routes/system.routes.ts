import { createModuleRoute } from './createModuleRoute'
import { IMPORT_PERMISSIONS } from '@/data/import-types'

export const systemRoutes = [
  {
    path: '/system/data-import',
    name: 'data-import',
    component: () => import('@/views/system/data-import/DataImportView.vue'),
    meta: {
      title: 'Data Import',
      requiresAuth: true,
      permissions: IMPORT_PERMISSIONS,
    },
  },
  {
    path: '/system/users',
    component: () => import('@/views/system/users/UserManagementView.vue'),
    meta: { title: 'Pengguna', requiresAuth: true, permission: 'users.view' },
  },
  {
    path: '/system/roles',
    component: () => import('@/views/system/roles/RoleManagementView.vue'),
    meta: { title: 'Peran & Hak Akses', requiresAuth: true, permission: 'roles.view' },
  },
  {
    path: '/system/audit-logs',
    component: () => import('@/views/system/logs/SystemLogView.vue'),
    meta: {
      title: 'Audit Log',
      requiresAuth: true,
      permission: 'audit-logs.view',
      logType: 'audit',
    },
  },
  {
    path: '/system/error-logs',
    component: () => import('@/views/system/logs/SystemLogView.vue'),
    meta: {
      title: 'Error Log',
      requiresAuth: true,
      permission: 'error-logs.view',
      logType: 'error',
    },
  },
  createModuleRoute('/system/backup', 'Backup & Restore', true),
  {
    path: '/system/settings',
    name: 'system-settings',
    component: () => import('@/views/system/settings/SettingsView.vue'),
    meta: { title: 'Pengaturan', requiresAuth: true, permission: 'settings.view' },
  },
]
