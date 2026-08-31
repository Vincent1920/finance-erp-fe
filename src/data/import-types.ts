import type { ImportType, ImportTypeConfig } from '@/types/data-import'

type ImportTypeDefinition = Pick<
  ImportTypeConfig,
  'type' | 'label' | 'permission' | 'supportsImportAs' | 'isAccounting' | 'defaultErrorPolicy'
> & {
  description: string
}

export const IMPORT_TYPE_DEFINITIONS: readonly ImportTypeDefinition[] = [
  {
    type: 'customer',
    label: 'Pelanggan',
    permission: 'import.customer',
    supportsImportAs: false,
    isAccounting: false,
    defaultErrorPolicy: 'valid_only',
    description: 'Data pelanggan, termin pembayaran, pajak, dan saldo awal.',
  },
  {
    type: 'supplier',
    label: 'Pemasok',
    permission: 'import.supplier',
    supportsImportAs: false,
    isAccounting: false,
    defaultErrorPolicy: 'valid_only',
    description: 'Data pemasok, termin pembayaran, pajak, dan saldo awal.',
  },
  {
    type: 'item',
    label: 'Barang & Jasa',
    permission: 'import.item',
    supportsImportAs: false,
    isAccounting: false,
    defaultErrorPolicy: 'valid_only',
    description: 'Master barang, jasa, satuan, harga, gudang, dan minimum stok.',
  },
  {
    type: 'chart_of_accounts',
    label: 'Chart of Accounts',
    permission: 'import.chart_of_accounts',
    supportsImportAs: false,
    isAccounting: true,
    defaultErrorPolicy: 'all_or_nothing',
    description: 'Struktur akun buku besar dan klasifikasi laporan keuangan.',
  },
  {
    type: 'opening_balance',
    label: 'Saldo Awal',
    permission: 'import.opening_balance',
    supportsImportAs: false,
    isAccounting: true,
    defaultErrorPolicy: 'all_or_nothing',
    description: 'Saldo awal akun, piutang, utang, dan posisi pembukaan.',
  },
  {
    type: 'sales',
    label: 'Transaksi Penjualan',
    permission: 'import.sales',
    supportsImportAs: true,
    isAccounting: true,
    defaultErrorPolicy: 'all_or_nothing',
    description: 'Invoice penjualan melalui validasi penjualan, stok, AR, dan jurnal.',
  },
  {
    type: 'purchase',
    label: 'Transaksi Pembelian',
    permission: 'import.purchase',
    supportsImportAs: true,
    isAccounting: true,
    defaultErrorPolicy: 'all_or_nothing',
    description: 'Invoice pembelian melalui validasi pembelian, stok, AP, dan jurnal.',
  },
  {
    type: 'journal',
    label: 'Jurnal Umum',
    permission: 'import.journal',
    supportsImportAs: true,
    isAccounting: true,
    defaultErrorPolicy: 'all_or_nothing',
    description: 'Jurnal debit dan kredit dengan validasi akun serta periode.',
  },
  {
    type: 'inventory',
    label: 'Saldo Awal Persediaan',
    permission: 'import.inventory',
    supportsImportAs: false,
    isAccounting: true,
    defaultErrorPolicy: 'all_or_nothing',
    description: 'Kuantitas dan nilai stok pembukaan per barang dan gudang.',
  },
  {
    type: 'bank_statement',
    label: 'Mutasi Bank',
    permission: 'import.bank_statement',
    supportsImportAs: false,
    isAccounting: true,
    defaultErrorPolicy: 'all_or_nothing',
    description: 'Mutasi debit/kredit bank untuk proses rekonsiliasi.',
  },
] as const

export const IMPORT_PERMISSIONS = IMPORT_TYPE_DEFINITIONS.map(({ permission }) => permission)

export const getImportTypeDefinition = (type: ImportType) =>
  IMPORT_TYPE_DEFINITIONS.find((definition) => definition.type === type)
