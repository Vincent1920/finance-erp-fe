import type { RouteRecordRaw } from 'vue-router'

import { createModuleRoute } from './createModuleRoute'

export const bankingRoutes: RouteRecordRaw[] = [
  {
    path: '/banking/accounts',
    name: 'bank-accounts',
    component: () => import('@/views/banking/accounts/BankAccountListView.vue'),
    meta: { title: 'Rekening Bank', requiresAuth: true, permission: 'bank-accounts.view' },
  },
  createModuleRoute('/banking/statements', 'Mutasi Bank'),
  createModuleRoute('/banking/reconciliation', 'Rekonsiliasi Bank'),
  createModuleRoute('/banking/cash-book', 'Buku Kas'),
]
