import { createModuleRoute } from './createModuleRoute'

export const accountingRoutes = [
  {
    path: '/accounting/journals/new',
    component: () => import('@/views/accounting/journals/JournalFormView.vue'),
    meta: { title: 'Jurnal Umum', requiresAuth: true, permission: 'accounting.create' },
  },
  {
    path: '/accounting/journals',
    component: () => import('@/views/accounting/journals/JournalListView.vue'),
    meta: { title: 'Daftar Jurnal', requiresAuth: true, permission: 'accounting.view' },
  },
  {
    path: '/accounting/journals/:id/edit',
    component: () => import('@/views/accounting/journals/JournalFormView.vue'),
    meta: { title: 'Edit Jurnal', requiresAuth: true, permission: 'accounting.update' },
  },
  {
    path: '/accounting/journals/:id',
    component: () => import('@/views/accounting/journals/JournalDetailView.vue'),
    meta: { title: 'Detail Jurnal', requiresAuth: true, permission: 'accounting.view' },
  },
  createModuleRoute('/accounting/recurring-journals', 'Jurnal Berulang', true),
  {
    path: '/accounting/general-ledger',
    component: () => import('@/views/reports/OperationalReportView.vue'),
    meta: {
      title: 'Buku Besar',
      requiresAuth: true,
      permission: 'reports.view',
      report: 'general-ledger',
    },
  },
  {
    path: '/accounting/trial-balance',
    component: () => import('@/views/reports/OperationalReportView.vue'),
    meta: {
      title: 'Neraca Saldo',
      requiresAuth: true,
      permission: 'reports.view',
      report: 'trial-balance',
    },
  },
  createModuleRoute('/accounting/closing', 'Tutup Periode'),
  createModuleRoute('/accounting/year-end', 'Tutup Tahun', true),
]
