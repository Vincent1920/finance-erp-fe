import { createModuleRoute } from './createModuleRoute'

export const salesRoutes = [
  createModuleRoute('/sales/orders', 'Sales Order'),
  createModuleRoute('/sales/invoices', 'Sales Invoice'),
  createModuleRoute('/sales/returns', 'Retur Penjualan'),
  createModuleRoute('/sales/receivables', 'Piutang Usaha'),
]
