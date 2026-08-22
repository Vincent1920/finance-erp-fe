import { createModuleRoute } from './createModuleRoute'

export const systemRoutes = [
  createModuleRoute('/system/users', 'Pengguna'),
  createModuleRoute('/system/roles', 'Peran & Hak Akses'),
  createModuleRoute('/system/audit-logs', 'Audit Log'),
  createModuleRoute('/system/error-logs', 'Error Log', true),
  createModuleRoute('/system/backup', 'Backup & Restore', true),
  createModuleRoute('/system/settings', 'Pengaturan'),
]
