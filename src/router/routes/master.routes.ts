import { createModuleRoute } from './createModuleRoute'

export const masterRoutes = [
  createModuleRoute('/master/periods', 'Periode Akuntansi', true),
  createModuleRoute('/master/customers', 'Pelanggan'),
  createModuleRoute('/master/suppliers', 'Pemasok'),
  createModuleRoute('/master/items', 'Barang & Jasa'),
  createModuleRoute('/master/warehouses', 'Gudang', true),
  createModuleRoute('/master/units', 'Satuan / UOM', true),
  createModuleRoute('/master/tax-codes', 'Kode Pajak', true),
  createModuleRoute('/master/cost-centers', 'Pusat Biaya', true),
  createModuleRoute('/master/projects', 'Proyek', true),
]
