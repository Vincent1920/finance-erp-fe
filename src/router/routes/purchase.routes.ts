import type { RouteRecordRaw } from 'vue-router'
import { createModuleRoute } from './createModuleRoute'

export const purchaseRoutes: RouteRecordRaw[] = [
  {
    path: '/purchases/orders',
    name: 'purchase-orders',
    component: () => import('@/views/purchases/orders/PurchaseOrderListView.vue'),
    meta: { title: 'Purchase Order', requiresAuth: true, permission: 'purchase-orders.view' },
  },
  {
    path: '/purchases/orders/new',
    name: 'purchase-orders-new',
    component: () => import('@/views/purchases/orders/PurchaseOrderFormView.vue'),
    meta: {
      title: 'Buat Purchase Order',
      requiresAuth: true,
      permission: 'purchase-orders.create',
    },
  },
  {
    path: '/purchases/orders/:id/edit',
    name: 'purchase-orders-edit',
    component: () => import('@/views/purchases/orders/PurchaseOrderFormView.vue'),
    meta: {
      title: 'Edit Purchase Order',
      requiresAuth: true,
      permission: 'purchase-orders.update',
    },
  },
  {
    path: '/purchases/orders/:id',
    name: 'purchase-orders-detail',
    component: () => import('@/views/purchases/orders/PurchaseOrderDetailView.vue'),
    meta: {
      title: 'Detail Purchase Order',
      requiresAuth: true,
      permission: 'purchase-orders.view',
    },
  },
  createModuleRoute('/purchases/invoices', 'Purchase Invoice'),
  createModuleRoute('/purchases/returns', 'Retur Pembelian'),
  createModuleRoute('/purchases/payables', 'Utang Usaha'),
]
