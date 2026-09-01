import type { EntityService } from '@/services/entity.service'
import { accountService } from '@/services/account.service'
import { bankAccountService } from '@/services/bank-account.service'
import { costCenterService } from '@/services/cost-center.service'
import { customerService } from '@/services/customer.service'
import { itemService } from '@/services/item.service'
import { periodService } from '@/services/period.service'
import { projectService } from '@/services/project.service'
import { supplierService } from '@/services/supplier.service'
import { taxCodeService } from '@/services/tax-code.service'
import { unitService } from '@/services/unit.service'
import { warehouseService } from '@/services/warehouse.service'
import type { EntityRecord } from '@/types/master'
import type { MasterWorkspaceConfig, WorkspaceFilter, WorkspaceOption } from '@/types/workspace'

const activeFilter: WorkspaceFilter = {
  key: 'is_active',
  label: 'Status',
  options: [
    { label: 'Aktif', value: 'true' },
    { label: 'Nonaktif', value: 'false' },
  ],
}

const optionsFrom = async <T extends EntityRecord>(
  service: EntityService<T>,
  label: (row: T) => string,
  params: Record<string, string | number | boolean> = {},
): Promise<WorkspaceOption[]> => {
  const response = await service.list({
    page: 1,
    limit: 500,
    sort: 'name',
    order: 'asc',
    ...params,
  })
  return response.data.map((row) => ({ label: label(row), value: row.id }))
}

const accountOptions = () =>
  optionsFrom(accountService, (account) => `${account.code} — ${account.name}`, {
    is_active: true,
    is_header: true,
  })
const postingAccountOptions = () =>
  optionsFrom(accountService, (account) => `${account.code} — ${account.name}`, {
    is_active: true,
    is_posting: true,
  })

export const accountWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Chart of Accounts',
  description: 'Kelola struktur akun yang digunakan oleh jurnal dan seluruh posting transaksi.',
  singular: 'Akun',
  permissionPrefix: 'accounts',
  service: accountService,
  defaultSort: 'code',
  exportFileName: 'chart-of-accounts.csv',
  filters: [
    {
      key: 'account_type',
      label: 'Tipe akun',
      options: [
        { label: 'Aset', value: 'asset' },
        { label: 'Liabilitas', value: 'liability' },
        { label: 'Ekuitas', value: 'equity' },
        { label: 'Pendapatan', value: 'revenue' },
        { label: 'HPP', value: 'cogs' },
        { label: 'Beban', value: 'expense' },
        { label: 'Pendapatan lain', value: 'other_income' },
        { label: 'Beban lain', value: 'other_expense' },
      ],
    },
    activeFilter,
  ],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'name', label: 'Nama akun', sortable: true },
    { key: 'account_type', label: 'Tipe', sortable: true },
    { key: 'normal_balance', label: 'Saldo normal' },
    { key: 'is_posting', label: 'Akun posting', format: (value) => (value ? 'Ya' : 'Tidak') },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode akun', required: true, minLength: 2, maxLength: 30 },
    { key: 'name', label: 'Nama akun', required: true, minLength: 2, maxLength: 191 },
    {
      key: 'account_type',
      label: 'Tipe akun',
      type: 'select',
      required: true,
      options: [
        { label: 'Aset', value: 'asset' },
        { label: 'Liabilitas', value: 'liability' },
        { label: 'Ekuitas', value: 'equity' },
        { label: 'Pendapatan', value: 'revenue' },
        { label: 'Harga Pokok Penjualan', value: 'cogs' },
        { label: 'Beban', value: 'expense' },
        { label: 'Pendapatan lain', value: 'other_income' },
        { label: 'Beban lain', value: 'other_expense' },
      ],
    },
    {
      key: 'normal_balance',
      label: 'Saldo normal',
      type: 'select',
      required: true,
      options: [
        { label: 'Debit', value: 'debit' },
        { label: 'Kredit', value: 'credit' },
      ],
    },
    {
      key: 'parent_id',
      label: 'Akun induk',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: accountOptions,
    },
    {
      key: 'level',
      label: 'Level',
      type: 'number',
      required: true,
      min: 0,
      max: 10,
      defaultValue: 0,
    },
    {
      key: 'cash_flow_category',
      label: 'Kategori arus kas',
      type: 'select',
      nullable: true,
      options: [
        { label: 'Operasional', value: 'operating' },
        { label: 'Investasi', value: 'investing' },
        { label: 'Pendanaan', value: 'financing' },
        { label: 'Nonkas', value: 'non_cash' },
      ],
    },
    { key: 'report_group', label: 'Grup laporan', nullable: true, maxLength: 100 },
    {
      key: 'is_header',
      label: 'Akun header',
      type: 'checkbox',
      defaultValue: false,
      help: 'Akun header tidak menerima posting jurnal.',
    },
    { key: 'is_posting', label: 'Dapat menerima posting', type: 'checkbox', defaultValue: true },
    {
      key: 'allow_manual_journal',
      label: 'Izinkan jurnal manual',
      type: 'checkbox',
      defaultValue: true,
    },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
  validate: (form) =>
    form.is_header && form.is_posting
      ? { is_posting: 'Akun header tidak boleh menerima posting.' }
      : {},
}

export const periodWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Periode Akuntansi',
  description:
    'Kelola kalender pembukuan. Penutupan dan pembukaan ulang tetap melalui workflow penutupan.',
  singular: 'Periode',
  permissionPrefix: 'accounting-periods',
  service: periodService,
  defaultSort: 'start_date',
  canDelete: false,
  filters: [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Terbuka', value: 'open' },
        { label: 'Ditutup sementara', value: 'soft_closed' },
        { label: 'Ditutup', value: 'closed' },
      ],
    },
  ],
  columns: [
    { key: 'year', label: 'Tahun', sortable: true, type: 'number' },
    { key: 'month', label: 'Bulan', sortable: true, type: 'number' },
    { key: 'start_date', label: 'Mulai', sortable: true, type: 'date' },
    { key: 'end_date', label: 'Selesai', sortable: true, type: 'date' },
    { key: 'status', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'year', label: 'Tahun', type: 'number', required: true, min: 2000, max: 2200 },
    {
      key: 'month',
      label: 'Bulan',
      type: 'select',
      required: true,
      valueType: 'number',
      options: Array.from({ length: 12 }, (_, index) => ({
        label: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, index, 1)),
        value: index + 1,
      })),
    },
    { key: 'start_date', label: 'Tanggal mulai', type: 'date', required: true },
    { key: 'end_date', label: 'Tanggal selesai', type: 'date', required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      readOnlyOnEdit: true,
      help: 'Gunakan menu Tutup Periode untuk mengubah status periode yang sudah dibuat.',
      options: [
        { label: 'Terbuka', value: 'open' },
        { label: 'Ditutup sementara', value: 'soft_closed' },
        { label: 'Ditutup', value: 'closed' },
      ],
    },
    {
      key: 'close_notes',
      label: 'Catatan penutupan',
      type: 'textarea',
      nullable: true,
      span: 2,
      readOnlyOnEdit: true,
    },
  ],
  validate: (form) =>
    String(form.end_date ?? '') < String(form.start_date ?? '')
      ? { end_date: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' }
      : {},
}

export const customerWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Pelanggan',
  description: 'Kelola identitas, termin, limit kredit, dan pemetaan akun piutang pelanggan.',
  singular: 'Pelanggan',
  permissionPrefix: 'customers',
  service: customerService,
  defaultSort: 'code',
  exportFileName: 'pelanggan.csv',
  filters: [activeFilter],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'name', label: 'Nama', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telepon' },
    { key: 'credit_limit', label: 'Limit kredit', type: 'currency', align: 'right' },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode pelanggan', required: true, minLength: 2, maxLength: 30 },
    { key: 'name', label: 'Nama pelanggan', required: true, minLength: 2, maxLength: 191 },
    { key: 'tax_number', label: 'NPWP / nomor pajak', nullable: true, maxLength: 50 },
    { key: 'email', label: 'Email', type: 'email', nullable: true },
    { key: 'phone', label: 'Telepon', nullable: true, maxLength: 50 },
    { key: 'city', label: 'Kota', nullable: true, maxLength: 100 },
    { key: 'address', label: 'Alamat', type: 'textarea', nullable: true, span: 2 },
    {
      key: 'currency',
      label: 'Mata uang',
      required: true,
      defaultValue: 'IDR',
      minLength: 3,
      maxLength: 3,
    },
    {
      key: 'credit_limit',
      label: 'Limit kredit',
      type: 'number',
      required: true,
      min: 0,
      step: 0.01,
      defaultValue: 0,
    },
    {
      key: 'payment_term_days',
      label: 'Termin (hari)',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
    },
    {
      key: 'receivable_account_id',
      label: 'Akun piutang',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
}

export const supplierWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Pemasok',
  description: 'Kelola identitas, termin pembayaran, dan pemetaan akun utang pemasok.',
  singular: 'Pemasok',
  permissionPrefix: 'suppliers',
  service: supplierService,
  defaultSort: 'code',
  exportFileName: 'pemasok.csv',
  filters: [activeFilter],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'name', label: 'Nama', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telepon' },
    { key: 'payment_term_days', label: 'Termin', type: 'number', align: 'right' },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode pemasok', required: true, minLength: 2, maxLength: 30 },
    { key: 'name', label: 'Nama pemasok', required: true, minLength: 2, maxLength: 191 },
    { key: 'tax_number', label: 'NPWP / nomor pajak', nullable: true, maxLength: 50 },
    { key: 'email', label: 'Email', type: 'email', nullable: true },
    { key: 'phone', label: 'Telepon', nullable: true, maxLength: 50 },
    { key: 'city', label: 'Kota', nullable: true, maxLength: 100 },
    { key: 'address', label: 'Alamat', type: 'textarea', nullable: true, span: 2 },
    {
      key: 'currency',
      label: 'Mata uang',
      required: true,
      defaultValue: 'IDR',
      minLength: 3,
      maxLength: 3,
    },
    {
      key: 'payment_term_days',
      label: 'Termin (hari)',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
    },
    {
      key: 'payable_account_id',
      label: 'Akun utang',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
}

export const warehouseWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Gudang',
  description: 'Kelola lokasi penyimpanan yang digunakan oleh transaksi dan saldo persediaan.',
  singular: 'Gudang',
  permissionPrefix: 'warehouses',
  service: warehouseService,
  defaultSort: 'code',
  filters: [activeFilter],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'name', label: 'Nama gudang', sortable: true },
    { key: 'address', label: 'Alamat' },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode gudang', required: true, minLength: 1, maxLength: 30 },
    { key: 'name', label: 'Nama gudang', required: true, minLength: 2, maxLength: 150 },
    { key: 'address', label: 'Alamat', type: 'textarea', nullable: true, span: 2 },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
}

export const unitWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Satuan / UOM',
  description: 'Kelola satuan pengukuran untuk barang, jasa, dan pergerakan persediaan.',
  singular: 'Satuan',
  permissionPrefix: 'units',
  service: unitService,
  defaultSort: 'code',
  filters: [activeFilter],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'name', label: 'Nama satuan', sortable: true },
    { key: 'symbol', label: 'Simbol' },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode satuan', required: true, minLength: 1, maxLength: 30 },
    { key: 'name', label: 'Nama satuan', required: true, minLength: 2, maxLength: 100 },
    { key: 'symbol', label: 'Simbol', required: true, minLength: 1, maxLength: 20 },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
}

export const taxCodeWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Kode Pajak',
  description: 'Kelola tarif dan pemetaan akun pajak tanpa hardcode di aplikasi.',
  singular: 'Kode Pajak',
  permissionPrefix: 'tax-codes',
  service: taxCodeService,
  defaultSort: 'code',
  filters: [
    {
      key: 'tax_type',
      label: 'Jenis pajak',
      options: [
        { label: 'PPN / VAT', value: 'vat' },
        { label: 'Pemotongan', value: 'withholding' },
        { label: 'Lainnya', value: 'other' },
      ],
    },
    activeFilter,
  ],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'name', label: 'Nama pajak', sortable: true },
    { key: 'tax_type', label: 'Jenis' },
    {
      key: 'rate',
      label: 'Tarif',
      align: 'right',
      format: (value) => `${Number(value).toLocaleString('id-ID')}%`,
    },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode pajak', required: true, minLength: 1, maxLength: 30 },
    { key: 'name', label: 'Nama pajak', required: true, minLength: 2, maxLength: 100 },
    {
      key: 'tax_type',
      label: 'Jenis pajak',
      type: 'select',
      required: true,
      options: [
        { label: 'PPN / VAT', value: 'vat' },
        { label: 'Pemotongan / withholding', value: 'withholding' },
        { label: 'Lainnya / non-tax', value: 'other' },
      ],
    },
    {
      key: 'rate',
      label: 'Tarif (%)',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
      step: 0.0001,
    },
    {
      key: 'input_tax_account_id',
      label: 'Akun pajak masukan',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    {
      key: 'output_tax_account_id',
      label: 'Akun pajak keluaran',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
}

export const costCenterWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Pusat Biaya',
  description: 'Kelola dimensi pusat biaya untuk analisis jurnal, anggaran, dan laporan.',
  singular: 'Pusat Biaya',
  permissionPrefix: 'cost-centers',
  service: costCenterService,
  defaultSort: 'code',
  filters: [activeFilter],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'name', label: 'Nama pusat biaya', sortable: true },
    { key: 'description', label: 'Deskripsi' },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode pusat biaya', required: true, minLength: 1, maxLength: 30 },
    { key: 'name', label: 'Nama pusat biaya', required: true, minLength: 2, maxLength: 150 },
    { key: 'description', label: 'Deskripsi', type: 'textarea', nullable: true, span: 2 },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
}

export const projectWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Proyek',
  description: 'Kelola proyek sebagai dimensi transaksi, biaya, pendapatan, dan anggaran.',
  singular: 'Proyek',
  permissionPrefix: 'projects',
  service: projectService,
  defaultSort: 'code',
  filters: [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Direncanakan', value: 'planned' },
        { label: 'Aktif', value: 'active' },
        { label: 'Selesai', value: 'completed' },
        { label: 'Dibatalkan', value: 'cancelled' },
      ],
    },
  ],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'name', label: 'Nama proyek', sortable: true },
    { key: 'start_date', label: 'Mulai', type: 'date' },
    { key: 'end_date', label: 'Selesai', type: 'date' },
    { key: 'budget', label: 'Anggaran', type: 'currency', align: 'right' },
    { key: 'status', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode proyek', required: true, minLength: 1, maxLength: 30 },
    { key: 'name', label: 'Nama proyek', required: true, minLength: 2, maxLength: 191 },
    {
      key: 'customer_id',
      label: 'Pelanggan',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: () =>
        optionsFrom(customerService, (customer) => `${customer.code} — ${customer.name}`, {
          is_active: true,
        }),
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      options: [
        { label: 'Direncanakan', value: 'planned' },
        { label: 'Aktif', value: 'active' },
        { label: 'Selesai', value: 'completed' },
        { label: 'Dibatalkan', value: 'cancelled' },
      ],
    },
    { key: 'start_date', label: 'Tanggal mulai', type: 'date', nullable: true },
    { key: 'end_date', label: 'Tanggal selesai', type: 'date', nullable: true },
    {
      key: 'budget',
      label: 'Anggaran',
      type: 'number',
      required: true,
      min: 0,
      step: 0.01,
      defaultValue: 0,
    },
    { key: 'description', label: 'Deskripsi', type: 'textarea', nullable: true, span: 2 },
  ],
  validate: (form) =>
    form.start_date && form.end_date && String(form.end_date) < String(form.start_date)
      ? { end_date: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' }
      : {},
}

export const itemWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Barang & Jasa',
  description: 'Kelola item, harga, satuan, batas stok, dan pemetaan akun posting.',
  singular: 'Item',
  permissionPrefix: 'items',
  service: itemService,
  defaultSort: 'sku',
  exportFileName: 'barang-dan-jasa.csv',
  filters: [
    {
      key: 'item_type',
      label: 'Jenis item',
      options: [
        { label: 'Persediaan', value: 'inventory' },
        { label: 'Jasa', value: 'service' },
        { label: 'Nonpersediaan', value: 'non_inventory' },
      ],
    },
    activeFilter,
  ],
  columns: [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Nama item', sortable: true },
    { key: 'item_type', label: 'Jenis' },
    { key: 'sales_price', label: 'Harga jual', type: 'currency', align: 'right' },
    { key: 'average_cost', label: 'Biaya rata-rata', type: 'currency', align: 'right' },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'sku', label: 'SKU', required: true, minLength: 1, maxLength: 50 },
    { key: 'barcode', label: 'Barcode', nullable: true, maxLength: 100 },
    { key: 'name', label: 'Nama item', required: true, minLength: 2, maxLength: 191 },
    {
      key: 'item_type',
      label: 'Jenis item',
      type: 'select',
      required: true,
      options: [
        { label: 'Persediaan', value: 'inventory' },
        { label: 'Jasa', value: 'service' },
        { label: 'Nonpersediaan', value: 'non_inventory' },
      ],
    },
    {
      key: 'unit_id',
      label: 'Satuan',
      type: 'select',
      required: true,
      valueType: 'number',
      options: () =>
        optionsFrom(unitService, (unit) => `${unit.code} — ${unit.name}`, { is_active: true }),
    },
    { key: 'description', label: 'Deskripsi', type: 'textarea', nullable: true, span: 2 },
    {
      key: 'sales_price',
      label: 'Harga jual',
      type: 'number',
      required: true,
      min: 0,
      step: 0.01,
      defaultValue: 0,
    },
    {
      key: 'purchase_price',
      label: 'Harga beli',
      type: 'number',
      required: true,
      min: 0,
      step: 0.01,
      defaultValue: 0,
    },
    {
      key: 'average_cost',
      label: 'Biaya rata-rata',
      type: 'number',
      required: true,
      min: 0,
      step: 0.000001,
      defaultValue: 0,
      readOnlyOnEdit: true,
      help: 'Setelah item digunakan, nilai ini diperbarui otomatis oleh costing persediaan.',
    },
    {
      key: 'minimum_stock',
      label: 'Stok minimum',
      type: 'number',
      required: true,
      min: 0,
      step: 0.0001,
      defaultValue: 0,
    },
    {
      key: 'sales_account_id',
      label: 'Akun penjualan',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    {
      key: 'inventory_account_id',
      label: 'Akun persediaan',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    {
      key: 'cogs_account_id',
      label: 'Akun HPP',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    {
      key: 'purchase_account_id',
      label: 'Akun pembelian/beban',
      type: 'select',
      nullable: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
}

export const bankAccountWorkspaceConfig: MasterWorkspaceConfig = {
  title: 'Rekening Bank',
  description: 'Kelola rekening kas/bank dan pemetaan akun buku besar perusahaan.',
  singular: 'Rekening Bank',
  permissionPrefix: 'bank-accounts',
  service: bankAccountService,
  defaultSort: 'code',
  exportFileName: 'rekening-bank.csv',
  filters: [activeFilter],
  columns: [
    { key: 'code', label: 'Kode', sortable: true },
    { key: 'bank_name', label: 'Bank', sortable: true },
    { key: 'account_number', label: 'Nomor rekening' },
    { key: 'account_name', label: 'Nama rekening' },
    { key: 'currency', label: 'Mata uang' },
    { key: 'current_balance', label: 'Saldo', type: 'currency', align: 'right' },
    { key: 'is_active', label: 'Status', type: 'status' },
  ],
  fields: [
    { key: 'code', label: 'Kode rekening', required: true, minLength: 1, maxLength: 30 },
    { key: 'bank_name', label: 'Nama bank', required: true, minLength: 2, maxLength: 150 },
    {
      key: 'account_number',
      label: 'Nomor rekening',
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    {
      key: 'account_name',
      label: 'Nama pemilik rekening',
      required: true,
      minLength: 2,
      maxLength: 150,
    },
    {
      key: 'currency',
      label: 'Mata uang',
      required: true,
      defaultValue: 'IDR',
      minLength: 3,
      maxLength: 3,
    },
    {
      key: 'gl_account_id',
      label: 'Akun GL',
      type: 'select',
      required: true,
      valueType: 'number',
      options: postingAccountOptions,
    },
    {
      key: 'opening_balance',
      label: 'Saldo awal',
      type: 'number',
      required: true,
      step: 0.01,
      defaultValue: 0,
    },
    { key: 'is_active', label: 'Aktif', type: 'checkbox', defaultValue: true },
  ],
}
