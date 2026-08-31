import api from './api/client'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { SalesOrder, SalesOrderPayload } from '@/types/sales'

const endpoint = '/sales/orders'

export const salesOrderService = {
  list: async (params: ListQuery = {}) =>
    (await api.get<PaginatedResponse<SalesOrder>>(endpoint, { params })).data,
  get: async (id: number) =>
    (await api.get<ApiResponse<SalesOrder>>(`${endpoint}/${id}`)).data.data,
  create: async (payload: SalesOrderPayload) =>
    (await api.post<ApiResponse<{ id: number; orderNumber: string }>>(endpoint, payload)).data.data,
  update: async (id: number, payload: SalesOrderPayload) =>
    (await api.put<ApiResponse<{ id: number; version: number }>>(`${endpoint}/${id}`, payload)).data.data,
  confirm: async (id: number) =>
    (await api.post<ApiResponse<{ id: number; status: string }>>(`${endpoint}/${id}/confirm`)).data.data,
  cancel: async (id: number, reason: string) =>
    (await api.post<ApiResponse<{ id: number; status: string }>>(`${endpoint}/${id}/cancel`, { reason })).data.data,
  convertToInvoice: async (
    id: number,
    payload: { invoice_date: string; lines?: Array<{ sales_order_line_id: number; quantity: number }> },
  ) =>
    (await api.post<ApiResponse<{ id: number; invoiceNumber: string; orderStatus: string }>>(
      `${endpoint}/${id}/convert-to-invoice`,
      payload,
    )).data.data,
}
