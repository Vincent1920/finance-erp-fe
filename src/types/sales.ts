export type SalesOrderStatus = 'draft' | 'confirmed' | 'partially_invoiced' | 'invoiced' | 'cancelled'

export interface SalesOrderLine {
  id: number
  line_number: number
  item_id: number
  item_code: string
  item_name: string
  item_type: string
  description: string | null
  quantity: string | number
  delivered_quantity: string | number
  invoiced_quantity: string | number
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

export interface SalesOrder {
  id: number
  order_number: string
  order_date: string
  expected_date: string | null
  customer_id: number
  customer_code: string
  customer_name: string
  warehouse_id: number
  warehouse_code: string
  warehouse_name: string
  sales_person_id: number | null
  payment_term_days: number
  reference: string | null
  currency: string
  exchange_rate: string | number
  subtotal: string | number
  discount: string | number
  tax: string | number
  grand_total: string | number
  notes: string | null
  status: SalesOrderStatus
  fulfillment_status: string
  version: number
  line_count?: number
  created_at: string
  created_by_name?: string
  cancellation_reason?: string | null
  lines?: SalesOrderLine[]
}

export interface SalesOrderLinePayload {
  item_id: number
  description: string | null
  quantity: number
  unit_id: number
  unit_price: number
  discount_amount: number
  discount_percent: number
  tax_code_id: number | null
}

export interface SalesOrderPayload {
  order_date: string
  customer_id: number
  warehouse_id: number
  sales_person_id: number | null
  payment_term_days: number
  expected_date: string | null
  reference: string | null
  currency: string
  exchange_rate: number
  notes: string | null
  lines: SalesOrderLinePayload[]
  version?: number
}

export type SalesInvoiceStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'posted' | 'partially_paid' | 'paid' | 'reversed' | 'cancelled'
export interface SalesInvoiceLine {
  id: number; line_number: number; item_id: number; item_code: string; item_name: string; item_type: string
  description: string | null; quantity: string | number; unit_id: number; unit_code: string
  unit_price: string | number; discount: string | number; discount_percent: string | number
  tax_code_id: number | null; tax_code: string | null; tax_rate: string | number
  tax_amount: string | number; subtotal: string | number; revenue_account_id: number
}
export interface SalesInvoice {
  id: number; invoice_number: string; invoice_date: string; due_date: string
  customer_id: number; customer_code: string; customer_name: string
  warehouse_id: number | null; warehouse_code: string | null; warehouse_name: string | null
  sales_order_id: number | null; reference: string | null; notes: string | null
  currency: string; exchange_rate: string | number; subtotal: string | number; discount: string | number
  tax: string | number; grand_total: string | number; paid_amount: string | number; outstanding_amount: string | number
  payment_status: string; status: SalesInvoiceStatus; approval_status: string | null; version: number
  journal_id: number | null; rejection_reason: string | null; cancellation_reason: string | null
  created_at: string; created_by_name?: string; line_count?: number; lines?: SalesInvoiceLine[]
}
export interface SalesInvoiceLinePayload {
  item_id: number; description: string | null; quantity: number; unit_id: number
  unit_price: number; discount: number; discount_percent: number; tax_code_id: number | null
  revenue_account_id?: number | null
}
export interface SalesInvoicePayload {
  invoice_date: string; due_date: string; customer_id: number; warehouse_id: number | null
  reference: string | null; notes: string | null; currency: string; exchange_rate: number
  lines: SalesInvoiceLinePayload[]; version?: number
}
