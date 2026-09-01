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
  {
    path: '/purchases/invoices',
    name: 'purchase-invoices',
    component: () => import('@/views/purchases/invoices/PurchaseInvoiceListView.vue'),
    meta: { title: 'Purchase Invoice', requiresAuth: true, permission: 'purchase-invoices.view' },
  },
  {
    path: '/purchases/invoices/new',
    name: 'purchase-invoices-new',
    component: () => import('@/views/purchases/invoices/PurchaseInvoiceFormView.vue'),
    meta: {
      title: 'Buat Purchase Invoice',
      requiresAuth: true,
      permission: 'purchase-invoices.create',
    },
  },
  {
    path: '/purchases/invoices/:id/edit',
    name: 'purchase-invoices-edit',
    component: () => import('@/views/purchases/invoices/PurchaseInvoiceFormView.vue'),
    meta: {
      title: 'Edit Purchase Invoice',
      requiresAuth: true,
      permission: 'purchase-invoices.update',
    },
  },
  {
    path: '/purchases/invoices/:id',
    name: 'purchase-invoices-detail',
    component: () => import('@/views/purchases/invoices/PurchaseInvoiceDetailView.vue'),
    meta: {
      title: 'Detail Purchase Invoice',
      requiresAuth: true,
      permission: 'purchase-invoices.view',
    },
  },
  createModuleRoute('/purchases/returns', 'Retur Pembelian'),
  createModuleRoute('/purchases/payables', 'Utang Usaha'),
]
