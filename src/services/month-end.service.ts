import api from './api/client'
import type { ApiResponse } from '@/types/api'

export interface MonthEndDashboard {
  period: {
    id: number
    year: number
    month: number
    startDate: string
    endDate: string
    status: 'open' | 'soft_closed' | 'closed'
  }
  readinessScore: number
  counts: Record<string, number>
  tasks: Array<{ code: string; label: string; count: number; link: string }>
  latestCloseRun: {
    id: number
    status: string
    requested_status: string
    failures: number
  } | null
}

export const monthEndService = {
  dashboard: async (asOfDate: string) =>
    (
      await api.get<ApiResponse<MonthEndDashboard>>('/month-end', {
        params: { as_of_date: asOfDate },
      })
    ).data.data,
}
