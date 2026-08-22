import type { RouteRecordRaw } from 'vue-router'
import { moduleRoutes } from './module.routes'
const protectedMeta = (title: string, permission?: string) => ({
  title,
  permission,
  requiresAuth: true,
})
export const appRoutes: RouteRecordRaw = {
  path: '/',
  component: () => import('@/layouts/DashboardLayout.vue'),
  children: [
    { path: '', redirect: '/dashboard' },
    {
      path: 'dashboard',
      name: 'dashboard',
      component: () => import('@/views/dashboard/DashboardView.vue'),
      meta: protectedMeta('Dashboard', 'dashboard.view'),
    },
    {
      path: 'master/accounts',
      name: 'accounts',
      component: () => import('@/views/master/coa/CoaListView.vue'),
      meta: protectedMeta('Chart of Accounts', 'accounts.view'),
    },
    {
      path: 'transactions',
      name: 'transactions',
      component: () => import('@/views/transactions/TransactionBrowserView.vue'),
      meta: protectedMeta('Browser Transaksi', 'transactions.view'),
    },
    {
      path: 'search',
      name: 'search',
      component: () => import('@/views/search/GlobalSearchView.vue'),
      meta: protectedMeta('Pencarian Global'),
    },
    {
      path: 'reports/profit-loss',
      component: () => import('@/views/reports/FinancialReportView.vue'),
      meta: { ...protectedMeta('Laba Rugi', 'reports.view'), report: 'profit-loss' },
    },
    {
      path: 'reports/balance-sheet',
      component: () => import('@/views/reports/FinancialReportView.vue'),
      meta: { ...protectedMeta('Neraca', 'reports.view'), report: 'balance-sheet' },
    },
    {
      path: 'reports/cash-flow',
      component: () => import('@/views/reports/FinancialReportView.vue'),
      meta: { ...protectedMeta('Arus Kas', 'reports.view'), report: 'cash-flow' },
    },
    ...moduleRoutes.map((route) => ({ ...route, path: route.path.replace(/^\//, '') })),
  ],
}
