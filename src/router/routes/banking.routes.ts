import type { RouteRecordRaw } from 'vue-router'

import { createModuleRoute } from './createModuleRoute'

export const bankingRoutes: RouteRecordRaw[] = [
  {
    path: '/banking/accounts',
    name: 'bank-accounts',
    component: () => import('@/views/banking/accounts/BankAccountListView.vue'),
    meta: { title: 'Rekening Bank', requiresAuth: true, permission: 'bank-accounts.view' },
  },
  {
    path: '/banking/statements',
    component: () => import('@/views/banking/BankingWorkspaceView.vue'),
    meta: { title: 'Mutasi Bank', requiresAuth: true, permission: 'bank-statements.view' },
  },
  {
    path: '/banking/reconciliation',
    component: () => import('@/views/banking/BankingWorkspaceView.vue'),
    meta: {
      title: 'Rekonsiliasi Bank',
      requiresAuth: true,
      permission: 'bank-reconciliations.view',
    },
  },
  {
    path: '/banking/cash-book',
    component: () => import('@/views/banking/BankingWorkspaceView.vue'),
    meta: { title: 'Buku Kas', requiresAuth: true, permission: 'cash-book.view' },
  },
]
