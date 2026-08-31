import type { RouteRecordRaw } from 'vue-router'
import { createModuleRoute } from './createModuleRoute'

export const salesRoutes: RouteRecordRaw[] = [
  { path: '/sales/orders', name: 'sales-orders', component: () => import('@/views/sales/orders/SalesOrderListView.vue'), meta: { title: 'Sales Order', requiresAuth: true, permission: 'sales-orders.view' } },
  { path: '/sales/orders/new', name: 'sales-orders-new', component: () => import('@/views/sales/orders/SalesOrderFormView.vue'), meta: { title: 'Buat Sales Order', requiresAuth: true, permission: 'sales-orders.create' } },
  { path: '/sales/orders/:id/edit', name: 'sales-orders-edit', component: () => import('@/views/sales/orders/SalesOrderFormView.vue'), meta: { title: 'Edit Sales Order', requiresAuth: true, permission: 'sales-orders.update' } },
  { path: '/sales/orders/:id', name: 'sales-orders-detail', component: () => import('@/views/sales/orders/SalesOrderDetailView.vue'), meta: { title: 'Detail Sales Order', requiresAuth: true, permission: 'sales-orders.view' } },
  createModuleRoute('/sales/invoices', 'Sales Invoice'),
  createModuleRoute('/sales/returns', 'Retur Penjualan'),
  createModuleRoute('/sales/receivables', 'Piutang Usaha'),
]
