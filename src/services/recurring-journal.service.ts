import api from './api/client'
import type { ApiResponse } from '@/types/api'

export interface RecurringLine {
  accountId?: number
  account_id?: number
  account_code?: string
  account_name?: string
  description?: string | null
  costCenterId?: number | null
  projectId?: number | null
  debit: string | number
  credit: string | number
}

export interface RecurringTemplate {
  id: number
  template_number: string
  name: string
  description: string | null
  reference: string | null
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  interval_value: number
  interval_unit: 'day' | 'week' | 'month' | 'year' | null
  start_date: string
  next_run_date: string
  end_date: string | null
  currency: string
  exchange_rate: string | number
  auto_submit: boolean | number
  is_active: boolean | number
  is_due: boolean
  total_debit: string | number
  run_count: number
  last_journal_number: string | null
  last_scheduled_date: string | null
  version: number
  lines: RecurringLine[]
}

export interface RecurringPayload {
  name: string
  description?: string | null
  reference?: string | null
  frequency: RecurringTemplate['frequency']
  interval_value: number
  interval_unit: RecurringTemplate['interval_unit']
  start_date: string
  end_date?: string | null
  currency: string
  exchange_rate: string
  auto_submit: boolean
  lines: Array<{
    accountId: number
    description?: string
    debit: string
    credit: string
  }>
  version?: number
}

export const recurringJournalService = {
  list: async () =>
    (await api.get<ApiResponse<RecurringTemplate[]>>('/recurring-journals')).data.data,
  create: async (payload: RecurringPayload) =>
    (await api.post<ApiResponse<unknown>>('/recurring-journals', payload)).data.data,
  update: async (id: number, payload: RecurringPayload) =>
    (await api.put<ApiResponse<unknown>>(`/recurring-journals/${id}`, payload)).data.data,
  setActive: async (id: number, active: boolean) =>
    (await api.patch<ApiResponse<unknown>>(`/recurring-journals/${id}/active`, { active })).data
      .data,
  generate: async (id: number, asOfDate: string) =>
    (
      await api.post<ApiResponse<unknown>>(`/recurring-journals/${id}/generate`, {
        as_of_date: asOfDate,
      })
    ).data.data,
  generateDue: async (asOfDate: string) =>
    (
      await api.post<
        ApiResponse<{ generated: unknown[]; failed: Array<{ id: number; message: string }> }>
      >('/recurring-journals/generate-due', { as_of_date: asOfDate })
    ).data.data,
}
