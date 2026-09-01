import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ApiResponse } from '@/types/api'

export interface DashboardSummary {
  customers: number
  suppliers: number
  items: number
  postedJournals: number
  receivables: number
  payables: number
  inventoryValue: number
  bankBalance: number
  monthly: Array<{ month: string; sales: number; purchases: number }>
  recentJournals: Array<{
    id: number
    number: string
    date: string
    description: string
    amount: number
    status: string
  }>
}

export const dashboardService = {
  summary: async () =>
    (await api.get<ApiResponse<DashboardSummary>>(API_ENDPOINTS.dashboard)).data.data,
}
