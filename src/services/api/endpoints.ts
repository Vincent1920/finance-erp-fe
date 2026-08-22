export const API_ENDPOINTS = {
  auth: { login: '/auth/login', me: '/auth/me', logout: '/auth/logout' },
  accounts: '/accounts',
  customers: '/customers',
  suppliers: '/suppliers',
  items: '/items',
  transactions: '/transactions',
  dashboard: '/dashboard/summary',
  trialBalance: '/reports/trial-balance',
} as const
