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
  {
    path: '/accounting/recurring-journals',
    component: () => import('@/views/accounting/RecurringJournalView.vue'),
    meta: { title: 'Jurnal Berulang', requiresAuth: true, permission: 'accounting.view' },
  },
  {
    path: '/accounting/general-ledger',
    component: () => import('@/views/accounting/GeneralLedgerView.vue'),
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
  {
    path: '/accounting/month-end',
    component: () => import('@/views/accounting/MonthEndDashboardView.vue'),
    meta: {
      title: 'Dashboard Month-end',
      requiresAuth: true,
      permission: 'accounting.close_period',
    },
  },
  {
    path: '/accounting/closing',
    component: () => import('@/views/accounting/PeriodClosingView.vue'),
    meta: { title: 'Tutup Periode', requiresAuth: true, permission: 'accounting.close_period' },
  },
  {
    path: '/accounting/year-end',
    component: () => import('@/views/accounting/YearEndClosingView.vue'),
    meta: { title: 'Tutup Tahun', requiresAuth: true, permission: 'accounting.close_period' },
  },
]
