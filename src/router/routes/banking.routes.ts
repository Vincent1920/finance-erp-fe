import { createModuleRoute } from './createModuleRoute'

export const bankingRoutes = [
  createModuleRoute('/banking/accounts', 'Rekening Bank'),
  createModuleRoute('/banking/statements', 'Mutasi Bank'),
  createModuleRoute('/banking/reconciliation', 'Rekonsiliasi Bank'),
  createModuleRoute('/banking/cash-book', 'Buku Kas'),
]
