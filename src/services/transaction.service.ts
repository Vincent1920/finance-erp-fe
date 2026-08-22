import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { PaginatedResponse, ApiResponse } from '@/types/api'
import type { Transaction } from '@/types/accounting'
export const transactionService = {
  list: async (params?: Record<string, string>) =>
    (await api.get<PaginatedResponse<Transaction>>(API_ENDPOINTS.transactions, { params })).data,
  get: async (id: number) =>
    (await api.get<ApiResponse<Transaction>>(`${API_ENDPOINTS.transactions}/${id}`)).data.data,
}
