import type { PaginationMeta } from '@/types/api'

export const IMPORT_TYPES = [
  'customer',
  'supplier',
  'item',
  'chart_of_accounts',
  'opening_balance',
  'sales',
  'purchase',
  'journal',
  'inventory',
  'bank_statement',
] as const

export type ImportType = (typeof IMPORT_TYPES)[number]
export type ImportFileFormat = 'csv' | 'xlsx'
export type ImportErrorPolicy = 'all_or_nothing' | 'valid_only'
export type ImportAs = 'draft' | 'submitted'
export type ImportIssueSeverity = 'warning' | 'error'
export type ImportRowStatus = 'valid' | 'warning' | 'error' | 'duplicate'
export type ImportJobId = number | string

export type ImportJobStatus =
  | 'queued'
  | 'processing'
  | 'validated'
  | 'awaiting_confirmation'
  | 'ready'
  | 'importing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled'

export interface ImportTypeConfig {
  type: ImportType
  label: string
  permission: string
  requiredColumns: string[]
  optionalColumns: string[]
  supportsImportAs: boolean
  isAccounting: boolean
  defaultErrorPolicy: ImportErrorPolicy
  maxFileSize: number
  maxRows: number
}

export interface ImportJob {
  id: ImportJobId
  importNumber: string
  importType: ImportType
  fileName: string
  status: ImportJobStatus
  totalRows: number
  validRows: number
  warningRows: number
  errorRows: number
  importedRows: number
  failedRows: number
  uploadedAt: string
  completedAt: string | null
  errorMessage: string | null
  uploadedBy?: string
}

export interface ImportIssue {
  field: string
  value: unknown
  severity: ImportIssueSeverity
  code: string
  message: string
}

export interface ImportPreviewRow {
  id: ImportJobId
  rowNumber: number
  status: ImportRowStatus
  reference: string
  description: string
  isDuplicate: boolean
  data: Record<string, unknown>
  issues: ImportIssue[]
}

export interface ImportPreviewResult {
  job: ImportJob
  rows: ImportPreviewRow[]
  meta: PaginationMeta
}

export interface ConfirmImportOptions {
  errorPolicy: ImportErrorPolicy
  importAs: ImportAs
  skipDuplicates: true
}
