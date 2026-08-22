import { createModuleRoute } from './createModuleRoute'

export const accountingRoutes = [
  createModuleRoute('/accounting/journals/new', 'Jurnal Umum'),
  createModuleRoute('/accounting/journals', 'Daftar Jurnal'),
  createModuleRoute('/accounting/recurring-journals', 'Jurnal Berulang', true),
  createModuleRoute('/accounting/general-ledger', 'Buku Besar'),
  createModuleRoute('/accounting/trial-balance', 'Neraca Saldo'),
  createModuleRoute('/accounting/closing', 'Tutup Periode'),
  createModuleRoute('/accounting/year-end', 'Tutup Tahun', true),
]
