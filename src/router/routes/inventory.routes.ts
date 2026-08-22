import { createModuleRoute } from './createModuleRoute'

export const inventoryRoutes = [
  createModuleRoute('/inventory/stock', 'Ringkasan Stok'),
  createModuleRoute('/inventory/transfers', 'Transfer Stok'),
  createModuleRoute('/inventory/adjustments', 'Penyesuaian Stok'),
  createModuleRoute('/inventory/reports', 'Laporan Persediaan'),
]
