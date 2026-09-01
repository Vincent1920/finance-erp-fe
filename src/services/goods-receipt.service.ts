import api from './api/client'
import type { ApiResponse } from '@/types/api'
export interface GoodsReceipt {
  id: number
  receipt_number: string
  receipt_date: string
  purchase_order_id: number
  status: 'draft' | 'posted' | 'reversed' | 'cancelled'
}
const endpoint = '/purchases/receipts'
export const goodsReceiptService = {
  create: async (payload: {
    receipt_date: string
    purchase_order_id: number
    supplier_delivery_number: string | null
    reference: string | null
    notes: string | null
    lines: Array<{ purchase_order_line_id: number; quantity: number }>
  }) =>
    (
      await api.post<ApiResponse<{ id: number; receiptNumber: string; status: string }>>(
        endpoint,
        payload,
      )
    ).data.data,
  post: async (id: number) => (await api.post(`${endpoint}/${id}/post`)).data,
  get: async (id: number) =>
    (await api.get<ApiResponse<GoodsReceipt>>(`${endpoint}/${id}`)).data.data,
}
