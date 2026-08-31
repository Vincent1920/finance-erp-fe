import api from './api/client'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
export interface SalesReturnLine {
  id: number
  sales_invoice_line_id: number
  item_code: string
  item_name: string
  quantity: string | number
  unit_code: string
  subtotal: string | number
  tax_amount: string | number
  reason: string | null
}
export interface SalesReturn {
  id: number
  return_number: string
  return_date: string
  sales_invoice_id: number
  invoice_number: string
  customer_code: string
  customer_name: string
  reference: string | null
  currency: string
  grand_total: string | number
  reason: string
  status:
    'draft' | 'pending_approval' | 'approved' | 'posted' | 'rejected' | 'reversed' | 'cancelled'
  lines?: SalesReturnLine[]
}
const ep = '/sales/returns'
export const salesReturnService = {
  list: async (p: ListQuery = {}) =>
    (await api.get<PaginatedResponse<SalesReturn>>(ep, { params: p })).data,
  get: async (id: number) => (await api.get<ApiResponse<SalesReturn>>(`${ep}/${id}`)).data.data,
  create: async (p: {
    return_date: string
    sales_invoice_id: number
    reference: string | null
    reason: string
    lines: Array<{ sales_invoice_line_id: number; quantity: number; reason: string | null }>
  }) => (await api.post(ep, p)).data,
  submit: async (id: number) => (await api.post(`${ep}/${id}/submit`)).data,
  approve: async (id: number) => (await api.post(`${ep}/${id}/approve`)).data,
  reject: async (id: number, reason: string) =>
    (await api.post(`${ep}/${id}/reject`, { reason })).data,
  post: async (id: number) => (await api.post(`${ep}/${id}/post`)).data,
  cancel: async (id: number, reason: string) =>
    (await api.post(`${ep}/${id}/cancel`, { reason })).data,
  reverse: async (id: number, date: string, reason: string) =>
    (await api.post(`${ep}/${id}/reverse`, { date, reason })).data,
}
