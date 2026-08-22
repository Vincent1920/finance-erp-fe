import type { RouteRecordRaw } from 'vue-router'

import { accountingRoutes } from './accounting.routes'
import { bankingRoutes } from './banking.routes'
import { createModuleRoute } from './createModuleRoute'
import { inventoryRoutes } from './inventory.routes'
import { masterRoutes } from './master.routes'
import { purchaseRoutes } from './purchase.routes'
import { reportRoutes } from './report.routes'
import { salesRoutes } from './sales.routes'
import { systemRoutes } from './system.routes'

const supportingModuleRoutes = [
  createModuleRoute('/assets/fixed-assets', 'Aset Tetap'),
  createModuleRoute('/assets/depreciation', 'Penyusutan Aset'),
  createModuleRoute('/budgeting/budgets', 'Anggaran'),
  createModuleRoute('/budgeting/budget-vs-actual', 'Anggaran vs Aktual'),
  createModuleRoute('/approvals', 'Persetujuan Transaksi'),
]

export const moduleRoutes: RouteRecordRaw[] = [
  ...masterRoutes,
  ...salesRoutes,
  ...purchaseRoutes,
  ...inventoryRoutes,
  ...accountingRoutes,
  ...bankingRoutes,
  ...reportRoutes,
  ...supportingModuleRoutes,
  ...systemRoutes,
]
