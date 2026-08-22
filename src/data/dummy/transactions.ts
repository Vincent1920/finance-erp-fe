import type { Transaction } from '@/types/accounting'
const parties = [
  'PT Nusantara Abadi',
  'CV Sumber Makmur',
  'PT Teknologi Prima',
  'Koperasi Sejahtera',
  'PT Logistik Jaya',
]
export const transactions: Transaction[] = Array.from({ length: 36 }, (_, index) => ({
  id: index + 1,
  date: `2026-08-${String(23 - (index % 20)).padStart(2, '0')}`,
  number: `${index % 2 ? 'PI' : 'SI'}-2026-${String(1042 - index).padStart(4, '0')}`,
  type: index % 2 ? 'Purchase Invoice' : 'Sales Invoice',
  party: parties[index % parties.length],
  amount: 12500000 + ((index * 3750000) % 80000000),
  status: (['Posted', 'Paid', 'Pending Approval', 'Draft'] as const)[index % 4],
  createdBy: ['Aulia', 'Budi', 'Citra'][index % 3],
}))
