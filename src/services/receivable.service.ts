import api from './api/client'
import type { ApiResponse } from '@/types/api'
export interface ReceivableRow { id:number; invoice_number:string; invoice_date:string; due_date:string; party_id:number; party_code:string; party_name:string; currency:string; original_amount:string|number; paid_amount:string|number; returned_amount:string|number; outstanding_amount:string|number; days_overdue:number; aging_bucket:'current'|'1-30'|'31-60'|'61-90'|'>90' }
export interface ReceivableAging { asOfDate:string; rows:ReceivableRow[]; buckets:Record<ReceivableRow['aging_bucket'],string|number>; total:string|number }
export const receivableService={aging:async(asOfDate:string)=>(await api.get<ApiResponse<ReceivableAging>>('/sales/receivables/aging',{params:{as_of_date:asOfDate}})).data.data}
