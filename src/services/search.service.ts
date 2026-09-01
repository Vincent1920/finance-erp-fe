import api from './api/client'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'

export interface TransactionEntry {
  id: number
  date: string
  number: string
  type: string
  party: string
  amount: number
  status: string
  created_by: string
  reference?: string | null
  entity_type: string
}

export interface GlobalSearchEntry {
  id: number
  category: string
  title: string
  subtitle: string
  path: string
}

export const searchService = {
  transactions: async (params: ListQuery = {}) =>
    (await api.get<PaginatedResponse<TransactionEntry>>('/transactions', { params })).data,
  global: async (query: string) =>
    (await api.get<ApiResponse<GlobalSearchEntry[]>>('/global-search', { params: { q: query } }))
      .data.data,
}
