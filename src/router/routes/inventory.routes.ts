import type { RouteRecordRaw } from 'vue-router'

import { createModuleRoute } from './createModuleRoute'

export const inventoryRoutes: RouteRecordRaw[] = [
  {
    path: '/inventory/stock',
    name: 'inventory-stock',
    component: () => import('@/views/inventory/StockOverviewView.vue'),
    meta: { title: 'Ringkasan Stok', requiresAuth: true, permission: 'inventory.view' },
  },
  {
    path: '/inventory/transfers',
    component: () => import('@/views/inventory/StockWorkspaceView.vue'),
    meta: { title: 'Transfer Stok', requiresAuth: true, permission: 'stock-transfers.view' },
  },
  {
    path: '/inventory/adjustments',
    component: () => import('@/views/inventory/StockWorkspaceView.vue'),
    meta: { title: 'Penyesuaian Stok', requiresAuth: true, permission: 'stock-adjustments.view' },
  },
  {
    path: '/inventory/reports',
    name: 'inventory-reports',
    component: () => import('@/views/inventory/StockWorkspaceView.vue'),
    meta: { title: 'Laporan Persediaan', requiresAuth: true, permission: 'inventory.view' },
  },
]
