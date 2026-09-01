import { createModuleRoute } from './createModuleRoute'

export const reportRoutes = [
  {
    path: '/reports/receivable-aging',
    name: 'report-receivable-aging',
    component: () => import('@/views/sales/receivables/ReceivableView.vue'),
    meta: { title: 'Umur Piutang', requiresAuth: true, permission: 'sales-invoices.view' },
  },
  {
    path: '/reports/payable-aging',
    name: 'report-payable-aging',
    component: () => import('@/views/purchases/payables/PayableAgingView.vue'),
    meta: { title: 'Umur Utang', requiresAuth: true, permission: 'purchase-invoices.view' },
  },
  {
    path: '/reports/inventory',
    name: 'report-inventory',
    component: () => import('@/views/inventory/StockOverviewView.vue'),
    meta: { title: 'Laporan Persediaan', requiresAuth: true, permission: 'inventory.view' },
  },
  {
    path: '/reports/subledger',
    component: () => import('@/views/reports/OperationalReportView.vue'),
    meta: {
      title: 'Rekonsiliasi Subledger',
      requiresAuth: true,
      permission: 'reports.view',
      report: 'subledger',
    },
  },
]
