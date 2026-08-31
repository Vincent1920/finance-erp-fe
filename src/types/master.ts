export interface EntityRecord {
  id: number
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export interface AccountRecord extends EntityRecord {
  code: string
  name: string
  account_type:
    | 'asset'
    | 'liability'
    | 'equity'
    | 'revenue'
    | 'cogs'
    | 'expense'
    | 'other_income'
    | 'other_expense'
  normal_balance: 'debit' | 'credit'
  parent_id: number | null
  level: number
  is_header: boolean
  is_posting: boolean
  is_active: boolean
  allow_manual_journal: boolean
  cash_flow_category?: 'operating' | 'investing' | 'financing' | 'non_cash' | null
  report_group?: string | null
}

export interface AccountingPeriodRecord extends EntityRecord {
  year: number
  month: number
  start_date: string
  end_date: string
  status: 'open' | 'soft_closed' | 'closed'
  close_notes?: string | null
}

export interface CustomerRecord extends EntityRecord {
  code: string
  name: string
  tax_number?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  credit_limit: string | number
  payment_term_days: number
  currency?: string
  receivable_account_id?: number | null
  is_active: boolean
}

export interface SupplierRecord extends EntityRecord {
  code: string
  name: string
  tax_number?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  payment_term_days: number
  currency?: string
  payable_account_id?: number | null
  is_active: boolean
}

export interface UnitRecord extends EntityRecord {
  code: string
  name: string
  symbol: string
  is_active: boolean
}

export interface WarehouseRecord extends EntityRecord {
  code: string
  name: string
  address?: string | null
  is_active: boolean
}

export interface TaxCodeRecord extends EntityRecord {
  code: string
  name: string
  tax_type: 'vat' | 'withholding' | 'other'
  rate: string | number
  input_tax_account_id?: number | null
  output_tax_account_id?: number | null
  is_active: boolean
}

export interface CostCenterRecord extends EntityRecord {
  code: string
  name: string
  description?: string | null
  is_active: boolean
}

export interface ProjectRecord extends EntityRecord {
  code: string
  name: string
  customer_id?: number | null
  start_date?: string | null
  end_date?: string | null
  status?: string | null
  budget: string | number
  description?: string | null
}

export interface ItemRecord extends EntityRecord {
  sku: string
  barcode?: string | null
  name: string
  description?: string | null
  item_type: 'inventory' | 'service' | 'non_inventory'
  unit_id: number
  sales_account_id?: number | null
  inventory_account_id?: number | null
  cogs_account_id?: number | null
  purchase_account_id?: number | null
  sales_price: string | number
  purchase_price: string | number
  average_cost: string | number
  minimum_stock: string | number
  is_active: boolean
}

export interface BankAccountRecord extends EntityRecord {
  code: string
  bank_name: string
  account_number: string
  account_name: string
  currency: string
  gl_account_id: number
  opening_balance: string | number
  current_balance: string | number
  is_active: boolean
}
