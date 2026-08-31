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
  createModuleRoute('/system/users', 'Pengguna'),
  createModuleRoute('/system/roles', 'Peran & Hak Akses'),
  createModuleRoute('/system/audit-logs', 'Audit Log'),
  createModuleRoute('/system/error-logs', 'Error Log', true),
  createModuleRoute('/system/backup', 'Backup & Restore', true),
  createModuleRoute('/system/settings', 'Pengaturan'),
]
