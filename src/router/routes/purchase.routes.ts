import { createModuleRoute } from './createModuleRoute'

export const purchaseRoutes = [
  createModuleRoute('/purchases/orders', 'Purchase Order'),
  createModuleRoute('/purchases/invoices', 'Purchase Invoice'),
  createModuleRoute('/purchases/returns', 'Retur Pembelian'),
  createModuleRoute('/purchases/payables', 'Utang Usaha'),
]
