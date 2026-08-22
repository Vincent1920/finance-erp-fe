export interface Account {
  id: number
  code: string
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
  parentId?: number
  level: number
  openingBalance: number
  debit: number
  credit: number
  balance: number
  active: boolean
}
export interface DashboardMetric {
  label: string
  value: number
  change: number
  icon: string
  tone: 'blue' | 'green' | 'amber' | 'violet' | 'rose'
}
export interface Transaction {
  id: number
  date: string
  number: string
  type: string
  party: string
  amount: number
  status: 'Draft' | 'Pending Approval' | 'Posted' | 'Paid' | 'Cancelled'
  createdBy: string
}
