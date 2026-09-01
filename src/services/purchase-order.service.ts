import api from './api/client'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { PurchaseOrder, PurchaseOrderPayload } from '@/types/purchase'
const ep = '/purchases/orders'
export const purchaseOrderService = {
  list: async (p: ListQuery = {}) =>
    (await api.get<PaginatedResponse<PurchaseOrder>>(ep, { params: p })).data,
  get: async (id: number) => (await api.get<ApiResponse<PurchaseOrder>>(`${ep}/${id}`)).data.data,
  create: async (p: PurchaseOrderPayload) => (await api.post(ep, p)).data,
  update: async (id: number, p: PurchaseOrderPayload) => (await api.put(`${ep}/${id}`, p)).data,
  confirm: async (id: number) => (await api.post(`${ep}/${id}/confirm`)).data,
  cancel: async (id: number, reason: string) =>
    (await api.post(`${ep}/${id}/cancel`, { reason })).data,
}
