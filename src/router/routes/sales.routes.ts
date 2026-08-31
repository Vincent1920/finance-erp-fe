import type { RouteRecordRaw } from 'vue-router'
import { createModuleRoute } from './createModuleRoute'

export const salesRoutes: RouteRecordRaw[] = [
  { path: '/sales/orders', name: 'sales-orders', component: () => import('@/views/sales/orders/SalesOrderListView.vue'), meta: { title: 'Sales Order', requiresAuth: true, permission: 'sales-orders.view' } },
  { path: '/sales/orders/new', name: 'sales-orders-new', component: () => import('@/views/sales/orders/SalesOrderFormView.vue'), meta: { title: 'Buat Sales Order', requiresAuth: true, permission: 'sales-orders.create' } },
  { path: '/sales/orders/:id/edit', name: 'sales-orders-edit', component: () => import('@/views/sales/orders/SalesOrderFormView.vue'), meta: { title: 'Edit Sales Order', requiresAuth: true, permission: 'sales-orders.update' } },
  { path: '/sales/orders/:id', name: 'sales-orders-detail', component: () => import('@/views/sales/orders/SalesOrderDetailView.vue'), meta: { title: 'Detail Sales Order', requiresAuth: true, permission: 'sales-orders.view' } },
  { path: '/sales/invoices', name: 'sales-invoices', component: () => import('@/views/sales/invoices/SalesInvoiceListView.vue'), meta: { title: 'Sales Invoice', requiresAuth: true, permission: 'sales-invoices.view' } },
  { path: '/sales/invoices/new', name: 'sales-invoices-new', component: () => import('@/views/sales/invoices/SalesInvoiceFormView.vue'), meta: { title: 'Buat Sales Invoice', requiresAuth: true, permission: 'sales-invoices.create' } },
  { path: '/sales/invoices/:id/edit', name: 'sales-invoices-edit', component: () => import('@/views/sales/invoices/SalesInvoiceFormView.vue'), meta: { title: 'Edit Sales Invoice', requiresAuth: true, permission: 'sales-invoices.update' } },
  { path: '/sales/invoices/:id', name: 'sales-invoices-detail', component: () => import('@/views/sales/invoices/SalesInvoiceDetailView.vue'), meta: { title: 'Detail Sales Invoice', requiresAuth: true, permission: 'sales-invoices.view' } },
  { path: '/sales/returns', name: 'sales-returns', component: () => import('@/views/sales/returns/SalesReturnView.vue'), meta: { title: 'Retur Penjualan', requiresAuth: true, permission: 'sales-returns.view' } },
  { path: '/sales/receivables', name: 'receivables', component: () => import('@/views/sales/receivables/ReceivableView.vue'), meta: { title: 'Piutang Usaha', requiresAuth: true, permission: 'receivables.view' } },
]
