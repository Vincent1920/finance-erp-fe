import api from './api/client'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { Journal, JournalPayload } from '@/types/accounting'

const endpoint = '/journals'
export const journalService = {
  list: async (params: ListQuery = {}) =>
    (await api.get<PaginatedResponse<Journal>>(endpoint, { params })).data,
  get: async (id: number) => (await api.get<ApiResponse<Journal>>(`${endpoint}/${id}`)).data.data,
  create: async (payload: JournalPayload) =>
    (await api.post<ApiResponse<{ id: number }>>(endpoint, payload)).data.data,
  update: async (id: number, payload: JournalPayload) =>
    (await api.put<ApiResponse<Journal>>(`${endpoint}/${id}`, payload)).data.data,
  remove: async (id: number) => (await api.delete(`${endpoint}/${id}`)).data,
  submit: async (id: number) => (await api.post(`${endpoint}/${id}/submit`)).data,
  approve: async (id: number) => (await api.post(`${endpoint}/${id}/approve`)).data,
  reject: async (id: number, comments: string) =>
    (await api.post(`${endpoint}/${id}/reject`, { comments })).data,
  post: async (id: number) => (await api.post(`${endpoint}/${id}/post`)).data,
  reverse: async (id: number, reversalDate: string, reason: string) =>
    (await api.post(`${endpoint}/${id}/reverse`, { reversal_date: reversalDate, reason })).data,
}
