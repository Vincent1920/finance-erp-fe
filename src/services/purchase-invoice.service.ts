import api from './api/client'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { PurchaseInvoice, PurchaseInvoicePayload } from '@/types/purchase'
const endpoint = '/purchases/invoices'
export const purchaseInvoiceService = {
  list: async (params: ListQuery = {}) =>
    (await api.get<PaginatedResponse<PurchaseInvoice>>(endpoint, { params })).data,
  get: async (id: number) =>
    (await api.get<ApiResponse<PurchaseInvoice>>(`${endpoint}/${id}`)).data.data,
  create: async (payload: PurchaseInvoicePayload) => (await api.post(endpoint, payload)).data,
  update: async (id: number, payload: PurchaseInvoicePayload) =>
    (await api.put(`${endpoint}/${id}`, payload)).data,
  submit: async (id: number) => (await api.post(`${endpoint}/${id}/submit`)).data,
  approve: async (id: number) => (await api.post(`${endpoint}/${id}/approve`)).data,
  reject: async (id: number, reason: string) =>
    (await api.post(`${endpoint}/${id}/reject`, { reason })).data,
  post: async (id: number) => (await api.post(`${endpoint}/${id}/post`)).data,
  cancel: async (id: number, reason: string) =>
    (await api.post(`${endpoint}/${id}/cancel`, { reason })).data,
  reverse: async (id: number, date: string, reason: string) =>
    (await api.post(`${endpoint}/${id}/reverse`, { date, reason })).data,
}
