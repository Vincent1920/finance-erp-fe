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

export type JournalStatus =
  'draft' | 'pending_approval' | 'approved' | 'rejected' | 'posted' | 'reversed' | 'cancelled'

export interface JournalLine {
  id?: number
  accountId?: number
  account_id: number
  account_code?: string
  account_name?: string
  description?: string | null
  cost_center_id?: number | null
  project_id?: number | null
  debit: string | number
  credit: string | number
}

export interface Journal {
  id: number
  journal_number: string
  journal_date: string
  reference?: string | null
  description: string
  status: JournalStatus
  source_type?: string | null
  currency: string
  exchange_rate: string | number
  total_debit: string | number
  total_credit: string | number
  rejection_reason?: string | null
  created_by_name?: string
  approved_by_name?: string
  posted_by_name?: string
  lines?: JournalLine[]
}

export interface JournalPayload {
  journal_date: string
  reference: string | null
  description: string
  currency: string
  exchange_rate: string
  lines: Array<{
    accountId: number
    description?: string
    costCenterId?: number | null
    projectId?: number | null
    debit: string
    credit: string
  }>
}
