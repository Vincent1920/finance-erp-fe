import api from './api/client'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { SalesInvoice, SalesInvoicePayload } from '@/types/sales'
const endpoint = '/sales/invoices'
export const salesInvoiceService = {
  list: async (params: ListQuery = {}) => (await api.get<PaginatedResponse<SalesInvoice>>(endpoint, { params })).data,
  get: async (id: number) => (await api.get<ApiResponse<SalesInvoice>>(`${endpoint}/${id}`)).data.data,
  create: async (payload: SalesInvoicePayload) => (await api.post<ApiResponse<{id:number;invoiceNumber:string}>>(endpoint,payload)).data.data,
  update: async (id:number,payload:SalesInvoicePayload) => (await api.put<ApiResponse<{id:number;version:number}>>(`${endpoint}/${id}`,payload)).data.data,
  submit: async (id:number) => (await api.post(`${endpoint}/${id}/submit`)).data,
  approve: async (id:number) => (await api.post(`${endpoint}/${id}/approve`)).data,
  reject: async (id:number,reason:string) => (await api.post(`${endpoint}/${id}/reject`,{reason})).data,
  post: async (id:number) => (await api.post(`${endpoint}/${id}/post`)).data,
  cancel: async (id:number,reason:string) => (await api.post(`${endpoint}/${id}/cancel`,{reason})).data,
  reverse: async (id:number,date:string,reason:string) => (await api.post(`${endpoint}/${id}/reverse`,{date,reason})).data,
}
