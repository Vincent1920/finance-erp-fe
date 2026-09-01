export type PurchaseOrderStatus =
  'draft' | 'confirmed' | 'partially_received' | 'partially_billed' | 'completed' | 'cancelled'
export interface PurchaseOrderLine {
  id: number
  line_number: number
  item_id: number
  item_code: string
  item_name: string
  item_type: string
  description: string | null
  quantity: string | number
  received_quantity: string | number
  billed_quantity: string | number
  unit_id: number
  unit_code: string
  unit_price: string | number
  discount_percent: string | number
  discount_amount: string | number
  tax_code_id: number | null
  tax_code: string | null
  tax_rate: string | number
  tax_amount: string | number
  subtotal: string | number
}
export interface PurchaseOrder {
  id: number
  order_number: string
  order_date: string
  expected_date: string | null
  supplier_id: number
  supplier_code: string
  supplier_name: string
  warehouse_id: number
  warehouse_code: string
  warehouse_name: string
  payment_term_days: number
  supplier_reference: string | null
  currency: string
  exchange_rate: string | number
  subtotal: string | number
  discount: string | number
  tax: string | number
  grand_total: string | number
  notes: string | null
  status: PurchaseOrderStatus
  receipt_status: string
  billing_status: string
  version: number
  created_at: string
  cancellation_reason?: string | null
  lines?: PurchaseOrderLine[]
}
export interface PurchaseOrderLinePayload {
  item_id: number
  description: string | null
  quantity: number
  unit_id: number
  unit_price: number
  discount_amount: number
  discount_percent: number
  tax_code_id: number | null
}
export interface PurchaseOrderPayload {
  order_date: string
  supplier_id: number
  warehouse_id: number
  buyer_id: number | null
  payment_term_days: number
  expected_date: string | null
  supplier_reference: string | null
  currency: string
  exchange_rate: number
  notes: string | null
  lines: PurchaseOrderLinePayload[]
  version?: number
}
