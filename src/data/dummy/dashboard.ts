import type { DashboardMetric } from '@/types/accounting'
export const metrics: DashboardMetric[] = [
  {
    label: 'Saldo Kas',
    value: 1250000000,
    change: 8.4,
    icon: 'Wallet',
    tone: 'blue',
  },
  {
    label: 'Total Piutang',
    value: 485750000,
    change: 5.2,
    icon: 'CircleArrowDown',
    tone: 'green',
  },
  {
    label: 'Total Utang',
    value: 326400000,
    change: -2.1,
    icon: 'CircleArrowUp',
    tone: 'amber',
  },
  {
    label: 'Penjualan Bulan Ini',
    value: 892300000,
    change: 12.8,
    icon: 'TrendingUp',
    tone: 'violet',
  },
  {
    label: 'Pembelian Bulan Ini',
    value: 514900000,
    change: 4.6,
    icon: 'ShoppingCart',
    tone: 'rose',
  },
  {
    label: 'Laba Bersih',
    value: 217600000,
    change: 9.3,
    icon: 'BadgeDollarSign',
    tone: 'green',
  },
  {
    label: 'Nilai Persediaan',
    value: 738200000,
    change: 1.8,
    icon: 'Boxes',
    tone: 'blue',
  },
]
export const monthly = {
  labels: ['Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu'],
  revenue: [620, 680, 710, 790, 705, 760, 810, 825, 850, 880, 845, 892],
  expense: [440, 470, 485, 530, 495, 515, 540, 555, 570, 590, 605, 620],
}
export const aging = {
  receivable: [210, 135, 78, 42, 21],
  payable: [142, 96, 51, 24, 13],
}
