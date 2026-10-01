import api from '@/services/api/client'

export type TaxType =
  | 'ppn_output' | 'ppn_input' | 'pph'
  | 'pph21_employee' | 'pph21_non_employee' | 'pph23' | 'pph42'
export type TaxScope = 'all' | 'pph21' | 'ppn' | 'unification'
export type TaxComparisonStatus =
  | 'matched'
  | 'system_only'
  | 'reported_only'
  | 'amount_mismatch'
  | 'identity_mismatch'

export interface TaxComparisonRow {
  match_key: string
  status: TaxComparisonStatus
  tax_type: TaxType
  tax_group: Exclude<TaxScope, 'all'>
  source_key: string
  source_document_number: string
  match_method: '' | 'document_number' | 'identity_amount'
  document_number: string
  document_date: string
  counterparty_name: string
  counterparty_tax_number: string
  tax_code: string
  system_dpp: number
  reported_dpp: number
  dpp_difference: number
  system_tax: number
  reported_tax: number
  tax_difference: number
  source_description: string
  resolution_code: string
  resolution_note: string
}

export interface TaxTypeTotal {
  system_dpp: number
  system_tax: number
  reported_dpp: number
  reported_tax: number
  dpp_difference: number
  tax_difference: number
  system_documents: number
  reported_documents: number
}

export interface TaxReconciliationData {
  period: {
    id: number | null
    tax_period: string
    revision: number
    status: 'open' | 'reviewed' | 'locked'
    source_file: string | null
    notes?: string | null
    imported_at?: string | null
    reviewed_at?: string | null
    locked_at?: string | null
  }
  summary: { readiness: number; total: number; matched: number; resolved: number; exceptions: number }
  totals: Record<TaxType, TaxTypeTotal>
  groups: Record<Exclude<TaxScope, 'all'>, TaxTypeTotal>
  equalizations: Array<{ group: Exclude<TaxScope, 'all'>; key: string; label: string; book_amount: number; tax_amount: number; difference: number }>
  tax_accounts: Array<{ code: string; name: string; balance: number }>
  imported_rows: Array<TaxReportRowInput & { id?: number; source_key: string; tax_group: Exclude<TaxScope, 'all'> }>
  rows: TaxComparisonRow[]
}

export interface TaxReportRowInput {
  tax_type: TaxType
  document_number: string
  document_date: string
  counterparty_tax_number?: string | null
  counterparty_name?: string | null
  tax_code?: string | null
  dpp: number
  tax_amount: number
  description?: string | null
}

export const taxReconciliationService = {
  async get(period: string, scope: TaxScope = 'all') {
    return (await api.get('/operations/tax-reconciliation', { params: { period, scope } })).data
      .data as TaxReconciliationData
  },
  async importReport(payload: {
    period: string
    revision: number
    source_file: string
    notes: string
    rows: TaxReportRowInput[]
  }) {
    return (await api.post('/operations/tax-reconciliation/import', payload)).data.data
  },
  async importInternal(payload: {
    period: string
    revision: number
    source_file: string
    notes: string
    rows: TaxReportRowInput[]
  }) {
    return (await api.post('/operations/tax-reconciliation/import-internal', payload)).data.data
  },
  async linkDocument(payload: {
    source_key: string
    tax_document_number: string
    tax_document_date?: string | null
    notes: string
  }) {
    return (await api.put('/operations/tax-reconciliation/document', payload)).data.data
  },
  async resolve(payload: {
    period: string
    match_key: string
    resolution_code: string
    note: string
  }) {
    return (await api.put('/operations/tax-reconciliation/resolution', payload)).data.data
  },
  async setStatus(period: string, status: 'open' | 'reviewed' | 'locked') {
    return (await api.put('/operations/tax-reconciliation/status', { period, status })).data.data
  },
}
