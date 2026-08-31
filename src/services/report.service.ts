import api from './api/client'
import type { ApiResponse } from '@/types/api'

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
}
