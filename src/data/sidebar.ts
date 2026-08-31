import type { Component } from 'vue'
import {
  LayoutDashboard,
  Search,
  Database,
  ShoppingCart,
  PackageCheck,
  Boxes,
  BookOpen,
  Banknote,
  Landmark,
  ChartNoAxesCombined,
  FileChartColumn,
  Workflow,
  CalendarCheck,
  Settings,
} from 'lucide-vue-next'
import { IMPORT_PERMISSIONS } from '@/data/import-types'

export interface MenuItem {
  label: string
  to?: string
  icon?: Component
  permission?: string
  permissions?: readonly string[]
  children?: MenuItem[]
}

type MenuDefinition = [
  label: string,
  path: string,
  permission?: string,
  permissions?: readonly string[],
]

const createMenuGroup = (
  label: string,
  icon: Component,
  items: MenuDefinition[],
): MenuItem => ({
  label,
  icon,
  children: items.map(([itemLabel, path, permission, permissions]) => ({
    label: itemLabel,
    to: path,
    permission,
    permissions,
  })),
})

export const menu: MenuItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Pencarian', to: '/search', icon: Search },
  createMenuGroup('Master Data', Database, [
    ['Chart of Accounts', '/master/accounts', 'accounts.view'],
    ['Periode Akuntansi', '/master/periods', 'accounting-periods.view'],
    ['Pelanggan', '/master/customers', 'customers.view'],
    ['Pemasok', '/master/suppliers', 'suppliers.view'],
    ['Barang & Jasa', '/master/items', 'items.view'],
    ['Gudang', '/master/warehouses', 'warehouses.view'],
    ['Satuan / UOM', '/master/units', 'units.view'],
    ['Kode Pajak', '/master/tax-codes', 'tax-codes.view'],
    ['Pusat Biaya', '/master/cost-centers', 'cost-centers.view'],
    ['Proyek', '/master/projects', 'projects.view'],
  ]),
  createMenuGroup('Penjualan', ShoppingCart, [
    ['Sales Order', '/sales/orders', 'sales.view'],
    ['Sales Invoice', '/sales/invoices', 'sales.view'],
    ['Retur Penjualan', '/sales/returns', 'sales.view'],
    ['Piutang', '/sales/receivables', 'sales.view'],
  ]),
  createMenuGroup('Pembelian', PackageCheck, [
    ['Purchase Order', '/purchases/orders', 'purchases.view'],
    ['Purchase Invoice', '/purchases/invoices', 'purchases.view'],
    ['Retur Pembelian', '/purchases/returns', 'purchases.view'],
    ['Utang', '/purchases/payables', 'purchases.view'],
  ]),
  createMenuGroup('Persediaan', Boxes, [
    ['Ringkasan Stok', '/inventory/stock', 'inventory.view'],
    ['Transfer Stok', '/inventory/transfers', 'inventory.view'],
    ['Penyesuaian Stok', '/inventory/adjustments', 'inventory.view'],
    ['Laporan Persediaan', '/inventory/reports', 'inventory.view'],
  ]),
  createMenuGroup('Akuntansi', BookOpen, [
    ['Jurnal Umum', '/accounting/journals/new', 'accounting.create'],
    ['Daftar Jurnal', '/accounting/journals', 'accounting.view'],
    ['Jurnal Berulang', '/accounting/recurring-journals', 'accounting.view'],
    ['Buku Besar', '/accounting/general-ledger', 'accounting.view'],
    ['Neraca Saldo', '/accounting/trial-balance', 'accounting.view'],
  ]),
  createMenuGroup('Perbankan', Banknote, [
    ['Rekening Bank', '/banking/accounts', 'banking.view'],
    ['Mutasi Bank', '/banking/statements', 'banking.view'],
    ['Rekonsiliasi', '/banking/reconciliation', 'banking.view'],
    ['Buku Kas', '/banking/cash-book', 'banking.view'],
  ]),
  createMenuGroup('Aset', Landmark, [
    ['Aset Tetap', '/assets/fixed-assets', 'fixed-assets.view'],
    ['Penyusutan', '/assets/depreciation', 'fixed-assets.view'],
  ]),
  createMenuGroup('Anggaran', ChartNoAxesCombined, [
    ['Anggaran', '/budgeting/budgets', 'budgets.view'],
    ['Anggaran vs Aktual', '/budgeting/budget-vs-actual', 'budgets.view'],
  ]),
  createMenuGroup('Laporan', FileChartColumn, [
    ['Laba Rugi', '/reports/profit-loss', 'reports.view'],
    ['Neraca', '/reports/balance-sheet', 'reports.view'],
    ['Arus Kas', '/reports/cash-flow', 'reports.view'],
    ['Umur Piutang', '/reports/receivable-aging', 'reports.view'],
    ['Umur Utang', '/reports/payable-aging', 'reports.view'],
    ['Persediaan', '/reports/inventory', 'reports.view'],
    ['Rekonsiliasi Subledger', '/reports/subledger', 'reports.view'],
  ]),
  createMenuGroup('Workflow', Workflow, [
    ['Persetujuan Transaksi', '/approvals', 'approvals.view'],
    ['Browser Transaksi', '/transactions', 'transactions.view'],
  ]),
  createMenuGroup('Penutupan', CalendarCheck, [
    ['Tutup Periode', '/accounting/closing', 'accounting.close_period'],
    ['Tutup Tahun', '/accounting/year-end', 'accounting.close_period'],
  ]),
  createMenuGroup('Sistem', Settings, [
    ['Data Import', '/system/data-import', undefined, IMPORT_PERMISSIONS],
    ['Pengguna', '/system/users', 'users.view'],
    ['Peran & Hak Akses', '/system/roles', 'roles.view'],
    ['Audit Log', '/system/audit-logs', 'audit-logs.view'],
    ['Error Log', '/system/error-logs', 'error-logs.view'],
    ['Backup & Restore', '/system/backup', 'backups.view'],
    ['Pengaturan', '/system/settings', 'settings.view'],
  ]),
]
