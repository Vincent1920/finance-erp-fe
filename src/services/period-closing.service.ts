import api from './api/client'
import type { ApiResponse } from '@/types/api'

export interface PeriodCloseCheck {
  id: number
  check_code: string
  status: 'pending' | 'passed' | 'failed' | 'waived'
  is_blocking: boolean | number
  subledger_amount: string | number | null
  general_ledger_amount: string | number | null
  difference: string | number | null
  details: string | null
}

export interface ClosingPeriod {
  id: number
  year: number
  month: number
  start_date: string
  end_date: string
  status: 'open' | 'soft_closed' | 'closed'
  latest_run_id: number | null
  requested_status: 'soft_closed' | 'closed' | null
  run_status: 'draft' | 'validating' | 'failed' | 'validated' | 'completed' | null
  blocking_failures: number
  validated_at: string | null
  completed_at: string | null
  checks: PeriodCloseCheck[]
}

export const periodClosingService = {
  list: async (year?: number) =>
    (
      await api.get<ApiResponse<ClosingPeriod[]>>('/period-closing', {
        params: year ? { year } : undefined,
      })
    ).data.data,
  validate: async (payload: {
    period_id: number
    requested_status: 'soft_closed' | 'closed'
    notes?: string | null
  }) => (await api.post('/period-closing/validate', payload)).data.data,
  complete: async (runId: number) =>
    (await api.post(`/period-closing/${runId}/complete`)).data.data,
  reopen: async (periodId: number, reason: string) =>
    (await api.post(`/period-closing/${periodId}/reopen`, { reason })).data.data,
}
