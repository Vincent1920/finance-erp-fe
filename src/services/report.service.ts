import api from './api/client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export interface ReportAccountLine {
  accountId: number
  code: string
  name: string
  amount: string
}

export interface ProfitLossReport {
  range: { dateFrom: string; dateTo: string }
  sections: Record<string, { accounts: ReportAccountLine[]; total: string }>
  grossProfit: string
  operatingProfit: string
  profitBeforeTax: string
  netProfit: string
}

export interface BalanceSheetReport {
  asOfDate: string
  sections: {
    assets: { accounts: ReportAccountLine[]; total: string }
    liabilities: { accounts: ReportAccountLine[]; total: string }
    equity: {
      accounts: ReportAccountLine[]
      accountTotal: string
      currentYearEarnings: string
      total: string
    }
  }
  assets: string
  liabilities: string
  equity: string
  liabilitiesAndEquity: string
  difference: string
  balanced: boolean
}

export interface CashFlowReport {
  range: { dateFrom: string; dateTo: string }
  method: string
  activities: { operating: string; investing: string; financing: string }
  openingBalance: string
  netChange: string
  endingBalance: string
  difference: string
  reconciled: boolean
}

export interface AgingRow {
  id: number
  invoice_number: string
  invoice_date: string
  due_date: string
  party_code: string
  party_name: string
  currency: string
  original_amount: string | number
  paid_amount: string | number
  returned_amount: string | number
  outstanding_amount: string | number
  days_overdue: number
  aging_bucket: 'current' | '1-30' | '31-60' | '61-90' | '>90'
}

export interface AgingReport {
  asOfDate: string
  rows: AgingRow[]
  buckets: Record<AgingRow['aging_bucket'], string | number>
  total: string | number
}

export interface LedgerRow {
  id: number
  account_code: string
  account_name: string
  journal_number: string
  journal_date: string
  reference: string | null
  description: string
  debit: string | number
  credit: string | number
  running_balance: string | number
}
export interface TrialBalanceReport {
  accounts: Array<{
    id: number
    code: string
    name: string
    openingDebit: string
    openingCredit: string
    periodDebit: string
    periodCredit: string
    endingDebit: string
    endingCredit: string
  }>
  totals: {
    openingDebit: string
    openingCredit: string
    periodDebit: string
    periodCredit: string
    endingDebit: string
    endingCredit: string
  }
  balanced: boolean
  difference: string
}
export interface ReconciliationRow {
  type: string
  subledger: string | number
  generalLedger: string | number
  difference: string | number
  balanced: boolean
}
export interface BudgetActualRow {
  account_id: number
  account_code: string
  account_name: string
  budget: string | number
  actual: string | number
  variance: string | number
  variance_percentage: string | number | null
}

export const reportService = {
  profitLoss: async (dateFrom: string, dateTo: string) =>
    (
      await api.get<ApiResponse<ProfitLossReport>>('/reports/profit-loss', {
        params: { date_from: dateFrom, date_to: dateTo },
      })
    ).data.data,
  balanceSheet: async (asOfDate: string) =>
    (
      await api.get<ApiResponse<BalanceSheetReport>>('/reports/balance-sheet', {
        params: { as_of_date: asOfDate },
      })
    ).data.data,
  cashFlow: async (dateFrom: string, dateTo: string) =>
    (
      await api.get<ApiResponse<CashFlowReport>>('/reports/cash-flow', {
        params: { date_from: dateFrom, date_to: dateTo },
      })
    ).data.data,
  payableAging: async (asOfDate: string) =>
    (
      await api.get<ApiResponse<AgingReport>>('/reports/payable-aging', {
        params: { as_of_date: asOfDate },
      })
    ).data.data,
  generalLedger: async (dateFrom: string, dateTo: string) =>
    (
      await api.get<PaginatedResponse<LedgerRow>>('/reports/general-ledger', {
        params: { date_from: dateFrom, date_to: dateTo, limit: 100 },
      })
    ).data,
  trialBalance: async (dateFrom: string, dateTo: string) =>
    (
      await api.get<ApiResponse<TrialBalanceReport>>('/reports/trial-balance', {
        params: { date_from: dateFrom, date_to: dateTo },
      })
    ).data.data,
  subledger: async (asOfDate: string) =>
    (
      await api.get<ApiResponse<ReconciliationRow[]>>('/reports/subledger-reconciliation', {
        params: { as_of_date: asOfDate },
      })
    ).data.data,
  budgetVsActual: async (dateFrom: string, dateTo: string) =>
    (
      await api.get<ApiResponse<BudgetActualRow[]>>('/reports/budget-vs-actual', {
        params: { date_from: dateFrom, date_to: dateTo },
      })
    ).data.data,
}
