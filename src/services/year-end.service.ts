import api from './api/client'
import type { ApiResponse } from '@/types/api'

export interface YearEndAccount {
  id: number
  code: string
  name: string
}

export interface YearEndClosing {
  id: number
  fiscal_year: number
  closing_date: string
  status: 'draft' | 'validated' | 'posted' | 'reversed'
  current_year_earnings: string | number
  current_year_earnings_account_id: number
  retained_earnings_account_id: number
  current_account_code: string
  current_account_name: string
  retained_account_code: string
  retained_account_name: string
  closing_journal_number: string | null
  retained_journal_number: string | null
  notes: string | null
}

export interface YearEndPreview {
  id?: number
  status?: 'validated'
  range: { dateFrom: string; dateTo: string }
  netProfit: string
  accountLines: Array<{
    accountId: number
    code: string
    name: string
    accountType: string
    closingBalance: string
    debit: string
    credit: string
  }>
}

export interface YearEndPayload {
  fiscal_year: number
  current_year_earnings_account_id: number
  retained_earnings_account_id: number
  notes?: string | null
}

export const yearEndService = {
  overview: async () =>
    (
      await api.get<
        ApiResponse<{
          fiscalYearStart: number
          accounts: YearEndAccount[]
          closings: YearEndClosing[]
        }>
      >('/year-end')
    ).data.data,
  preview: async (payload: YearEndPayload) =>
    (await api.post<ApiResponse<YearEndPreview>>('/year-end/preview', payload)).data.data,
  validate: async (payload: YearEndPayload) =>
    (await api.post<ApiResponse<YearEndPreview>>('/year-end/validate', payload)).data.data,
  post: async (id: number) =>
    (await api.post<ApiResponse<unknown>>(`/year-end/${id}/post`)).data.data,
  reverse: async (id: number, reversalDate: string, reason: string) =>
    (
      await api.post<ApiResponse<unknown>>(`/year-end/${id}/reverse`, {
        reversal_date: reversalDate,
        reason,
      })
    ).data.data,
}
