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
  {
    path: '/payroll',
    component: () => import('@/views/payroll/PayrollView.vue'),
    meta: { title: 'PAYROLL', requiresAuth: true, permission: 'payroll.view' },
  },
  {
    path: '/tax/reconciliation',
    component: () => import('@/views/tax/TaxReconciliationView.vue'),
    meta: {
      title: 'Rekonsiliasi & Equalisasi Pajak',
      requiresAuth: true,
      permission: 'tax-reconciliation.view',
    },
  },
  {
    path: '/assets/fixed-assets',
    component: () => import('@/views/accounting/FixedAssetView.vue'),
    meta: { title: 'Aset Tetap', requiresAuth: true, permission: 'fixed-assets.view' },
  },
  {
    path: '/assets/depreciation',
    component: () => import('@/views/accounting/FixedAssetView.vue'),
    meta: { title: 'Penyusutan Aset', requiresAuth: true, permission: 'fixed-assets.view' },
  },
  {
    path: '/budgeting/budgets',
    component: () => import('@/views/accounting/BudgetView.vue'),
    meta: { title: 'Anggaran', requiresAuth: true, permission: 'budgets.view' },
  },
  {
    path: '/budgeting/budget-vs-actual',
    component: () => import('@/views/accounting/BudgetView.vue'),
    meta: {
      title: 'Anggaran vs Aktual',
      requiresAuth: true,
      permission: 'budgets.view',
      report: 'budget-vs-actual',
    },
  },
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
