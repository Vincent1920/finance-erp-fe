import type { RouteRecordRaw } from 'vue-router'

import { createModuleRoute } from './createModuleRoute'

export const inventoryRoutes: RouteRecordRaw[] = [
  {
    path: '/inventory/stock',
    name: 'inventory-stock',
    component: () => import('@/views/inventory/StockOverviewView.vue'),
    meta: { title: 'Ringkasan Stok', requiresAuth: true, permission: 'inventory.view' },
  },
  createModuleRoute('/inventory/transfers', 'Transfer Stok'),
  createModuleRoute('/inventory/adjustments', 'Penyesuaian Stok'),
  createModuleRoute('/inventory/reports', 'Laporan Persediaan'),
]
