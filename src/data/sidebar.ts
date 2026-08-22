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
export interface MenuItem {
  label: string
  to?: string
  icon?: Component
  children?: MenuItem[]
}
const createMenuGroup = (
  label: string,
  icon: Component,
  items: Array<[label: string, path: string]>,
): MenuItem => {
  return {
    label,
    icon,
    children: items.map(([itemLabel, path]) => ({
      label: itemLabel,
      to: path,
    })),
  }
}
export const menu: MenuItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Pencarian', to: '/search', icon: Search },
  createMenuGroup('Master Data', Database, [
    ['Chart of Accounts', '/master/accounts'],
    ['Periode Akuntansi', '/master/periods'],
    ['Pelanggan', '/master/customers'],
    ['Pemasok', '/master/suppliers'],
    ['Barang & Jasa', '/master/items'],
    ['Gudang', '/master/warehouses'],
    ['Satuan / UOM', '/master/units'],
    ['Kode Pajak', '/master/tax-codes'],
    ['Pusat Biaya', '/master/cost-centers'],
    ['Proyek', '/master/projects'],
  ]),
  createMenuGroup('Penjualan', ShoppingCart, [
    ['Sales Order', '/sales/orders'],
    ['Sales Invoice', '/sales/invoices'],
    ['Retur Penjualan', '/sales/returns'],
    ['Piutang', '/sales/receivables'],
  ]),
  createMenuGroup('Pembelian', PackageCheck, [
    ['Purchase Order', '/purchases/orders'],
    ['Purchase Invoice', '/purchases/invoices'],
    ['Retur Pembelian', '/purchases/returns'],
    ['Utang', '/purchases/payables'],
  ]),
  createMenuGroup('Persediaan', Boxes, [
    ['Ringkasan Stok', '/inventory/stock'],
    ['Transfer Stok', '/inventory/transfers'],
    ['Penyesuaian Stok', '/inventory/adjustments'],
    ['Laporan Persediaan', '/inventory/reports'],
  ]),
  createMenuGroup('Akuntansi', BookOpen, [
    ['Jurnal Umum', '/accounting/journals/new'],
    ['Daftar Jurnal', '/accounting/journals'],
    ['Jurnal Berulang', '/accounting/recurring-journals'],
    ['Buku Besar', '/accounting/general-ledger'],
    ['Neraca Saldo', '/accounting/trial-balance'],
  ]),
  createMenuGroup('Perbankan', Banknote, [
    ['Rekening Bank', '/banking/accounts'],
    ['Mutasi Bank', '/banking/statements'],
    ['Rekonsiliasi', '/banking/reconciliation'],
    ['Buku Kas', '/banking/cash-book'],
  ]),
  createMenuGroup('Aset', Landmark, [
    ['Aset Tetap', '/assets/fixed-assets'],
    ['Penyusutan', '/assets/depreciation'],
  ]),
  createMenuGroup('Anggaran', ChartNoAxesCombined, [
    ['Anggaran', '/budgeting/budgets'],
    ['Anggaran vs Aktual', '/budgeting/budget-vs-actual'],
  ]),
  createMenuGroup('Laporan', FileChartColumn, [
    ['Laba Rugi', '/reports/profit-loss'],
    ['Neraca', '/reports/balance-sheet'],
    ['Arus Kas', '/reports/cash-flow'],
    ['Umur Piutang', '/reports/receivable-aging'],
    ['Umur Utang', '/reports/payable-aging'],
    ['Persediaan', '/reports/inventory'],
    ['Rekonsiliasi Subledger', '/reports/subledger'],
  ]),
  createMenuGroup('Workflow', Workflow, [
    ['Persetujuan Transaksi', '/approvals'],
    ['Browser Transaksi', '/transactions'],
  ]),
  createMenuGroup('Penutupan', CalendarCheck, [
    ['Tutup Periode', '/accounting/closing'],
    ['Tutup Tahun', '/accounting/year-end'],
  ]),
  createMenuGroup('Sistem', Settings, [
    ['Pengguna', '/system/users'],
    ['Peran & Hak Akses', '/system/roles'],
    ['Audit Log', '/system/audit-logs'],
    ['Error Log', '/system/error-logs'],
    ['Backup & Restore', '/system/backup'],
    ['Pengaturan', '/system/settings'],
  ]),
]
