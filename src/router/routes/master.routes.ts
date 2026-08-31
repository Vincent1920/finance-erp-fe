import type { RouteRecordRaw } from 'vue-router'

export const masterRoutes: RouteRecordRaw[] = [
  {
    path: '/master/periods',
    name: 'accounting-periods',
    component: () => import('@/views/master/periods/PeriodListView.vue'),
    meta: { title: 'Periode Akuntansi', requiresAuth: true, permission: 'accounting-periods.view' },
  },
  {
    path: '/master/customers',
    name: 'customers',
    component: () => import('@/views/master/customers/CustomerListView.vue'),
    meta: { title: 'Pelanggan', requiresAuth: true, permission: 'customers.view' },
  },
  {
    path: '/master/suppliers',
    name: 'suppliers',
    component: () => import('@/views/master/suppliers/SupplierListView.vue'),
    meta: { title: 'Pemasok', requiresAuth: true, permission: 'suppliers.view' },
  },
  {
    path: '/master/items',
    name: 'items',
    component: () => import('@/views/master/items/ItemListView.vue'),
    meta: { title: 'Barang & Jasa', requiresAuth: true, permission: 'items.view' },
  },
  {
    path: '/master/warehouses',
    name: 'warehouses',
    component: () => import('@/views/master/warehouses/WarehouseListView.vue'),
    meta: { title: 'Gudang', requiresAuth: true, permission: 'warehouses.view' },
  },
  {
    path: '/master/units',
    name: 'units',
    component: () => import('@/views/master/units/UnitListView.vue'),
    meta: { title: 'Satuan / UOM', requiresAuth: true, permission: 'units.view' },
  },
  {
    path: '/master/tax-codes',
    name: 'tax-codes',
    component: () => import('@/views/master/tax-codes/TaxCodeListView.vue'),
    meta: { title: 'Kode Pajak', requiresAuth: true, permission: 'tax-codes.view' },
  },
  {
    path: '/master/cost-centers',
    name: 'cost-centers',
    component: () => import('@/views/master/cost-centers/CostCenterListView.vue'),
    meta: { title: 'Pusat Biaya', requiresAuth: true, permission: 'cost-centers.view' },
  },
  {
    path: '/master/projects',
    name: 'projects',
    component: () => import('@/views/master/projects/ProjectListView.vue'),
    meta: { title: 'Proyek', requiresAuth: true, permission: 'projects.view' },
  },
]
