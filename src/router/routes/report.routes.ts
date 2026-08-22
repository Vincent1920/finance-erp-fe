import { createModuleRoute } from './createModuleRoute'

export const reportRoutes = [
  createModuleRoute('/reports/receivable-aging', 'Umur Piutang'),
  createModuleRoute('/reports/payable-aging', 'Umur Utang'),
  createModuleRoute('/reports/inventory', 'Laporan Persediaan'),
  createModuleRoute('/reports/subledger', 'Rekonsiliasi Subledger', true),
]
