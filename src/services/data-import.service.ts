import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import { getImportTypeDefinition } from '@/data/import-types'
import type { ListQuery, PaginationMeta } from '@/types/api'
import {
  IMPORT_TYPES,
  type ConfirmImportOptions,
  type ImportErrorPolicy,
  type ImportFileFormat,
  type ImportIssue,
  type ImportJob,
  type ImportJobId,
  type ImportJobStatus,
  type ImportPreviewResult,
  type ImportPreviewRow,
  type ImportRowStatus,
  type ImportType,
  type ImportTypeConfig,
} from '@/types/data-import'

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const pick = (record: UnknownRecord, ...keys: string[]) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key]
  }
  return undefined
}

const stringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback

const numberValue = (value: unknown, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const booleanValue = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return fallback
}

const importTypeAliases: Record<string, ImportType> = {
  customer: 'customer',
  customers: 'customer',
  supplier: 'supplier',
  suppliers: 'supplier',
  item: 'item',
  items: 'item',
  items_services: 'item',
  chart_of_accounts: 'chart_of_accounts',
  chart_of_account: 'chart_of_accounts',
  accounts: 'chart_of_accounts',
  coa: 'chart_of_accounts',
  opening_balance: 'opening_balance',
  opening_balances: 'opening_balance',
  sales: 'sales',
  sales_transactions: 'sales',
  purchase: 'purchase',
  purchases: 'purchase',
  purchase_transactions: 'purchase',
  journal: 'journal',
  journals: 'journal',
  general_journal: 'journal',
  general_journals: 'journal',
  inventory: 'inventory',
  inventory_opening_balance: 'inventory',
  stock_opening_balance: 'inventory',
  bank_statement: 'bank_statement',
  bank_statements: 'bank_statement',
}

const normalizeImportType = (value: unknown): ImportType => {
  const normalized = stringValue(value)
    .trim()
    .toLowerCase()
    .replaceAll('-', '_')
    .replaceAll(' ', '_')
  const type = importTypeAliases[normalized]
  if (type) return type
  if ((IMPORT_TYPES as readonly string[]).includes(normalized)) return normalized as ImportType
  throw new Error(`Tipe import '${normalized || '-'}' tidak dikenali.`)
}

const normalizeErrorPolicy = (value: unknown): ImportErrorPolicy => {
  const policy = stringValue(value).toLowerCase()
  return policy === 'valid_only' ? 'valid_only' : 'all_or_nothing'
}

const normalizeJobStatus = (value: unknown): ImportJobStatus => {
  const status = stringValue(value).trim().toLowerCase().replaceAll('-', '_')
  const aliases: Record<string, ImportJobStatus> = {
    pending: 'queued',
    queued: 'queued',
    parsing: 'processing',
    validating: 'processing',
    processing: 'processing',
    previewed: 'validated',
    validated: 'validated',
    preview_ready: 'awaiting_confirmation',
    pending_confirmation: 'awaiting_confirmation',
    awaiting_confirmation: 'awaiting_confirmation',
    ready: 'ready',
    validation_failed: 'ready',
    uploaded: 'processing',
    confirmed: 'importing',
    importing: 'importing',
    completed: 'completed',
    completed_with_errors: 'completed_with_errors',
    failed: 'failed',
    canceled: 'cancelled',
    cancelled: 'cancelled',
  }
  return aliases[status] ?? 'processing'
}

const unwrapData = (payload: unknown) => {
  const envelope = asRecord(payload)
  return Object.prototype.hasOwnProperty.call(envelope, 'data') ? envelope.data : payload
}

const normalizeMeta = (value: unknown, itemCount = 0): PaginationMeta => {
  const record = asRecord(value)
  const page = Math.max(1, numberValue(pick(record, 'page', 'currentPage', 'current_page'), 1))
  const limit = Math.max(1, numberValue(pick(record, 'limit', 'perPage', 'per_page'), itemCount || 20))
  const total = Math.max(0, numberValue(record.total, itemCount))
  const totalPages = Math.max(
    1,
    numberValue(pick(record, 'totalPages', 'total_pages', 'lastPage', 'last_page'), Math.ceil(total / limit) || 1),
  )
  return { page, limit, total, totalPages }
}

const normalizeConfig = (value: unknown): ImportTypeConfig => {
  const record = asRecord(value)
  const type = normalizeImportType(pick(record, 'type', 'importType', 'import_type', 'value'))
  const fallback = getImportTypeDefinition(type)
  const maxFileSizeMb = pick(record, 'maxFileSizeMb', 'max_file_size_mb')
  const maxFileSize = maxFileSizeMb
    ? numberValue(maxFileSizeMb) * 1024 * 1024
    : numberValue(pick(record, 'maxFileSize', 'max_file_size'), 10 * 1024 * 1024)

  return {
    type,
    label: stringValue(record.label, fallback?.label ?? type),
    permission: stringValue(record.permission, fallback?.permission ?? `import.${type}`),
    requiredColumns: asArray(pick(record, 'requiredColumns', 'required_columns')).map((column) =>
      stringValue(column),
    ),
    optionalColumns: asArray(pick(record, 'optionalColumns', 'optional_columns')).map((column) =>
      stringValue(column),
    ),
    supportsImportAs: booleanValue(
      pick(record, 'supportsImportAs', 'supports_import_as'),
      fallback?.supportsImportAs,
    ),
    isAccounting: booleanValue(
      pick(record, 'isAccounting', 'is_accounting'),
      fallback?.isAccounting,
    ),
    defaultErrorPolicy: normalizeErrorPolicy(
      pick(record, 'defaultErrorPolicy', 'default_error_policy') ?? fallback?.defaultErrorPolicy,
    ),
    maxFileSize: Math.max(1, maxFileSize),
    maxRows: Math.max(1, numberValue(pick(record, 'maxRows', 'max_rows'), 10_000)),
  }
}

const normalizeJob = (value: unknown): ImportJob => {
  const record = asRecord(value)
  const id = pick(record, 'id', 'importId', 'import_id')
  if (typeof id !== 'number' && typeof id !== 'string') {
    throw new Error('Respons import tidak memiliki ID yang valid.')
  }

  const completedAt = pick(record, 'completedAt', 'completed_at')
  const errorMessage = pick(record, 'errorMessage', 'error_message')

  return {
    id,
    importNumber: stringValue(
      pick(record, 'importNumber', 'import_number', 'number'),
      `IMP-${String(id)}`,
    ),
    importType: normalizeImportType(pick(record, 'importType', 'import_type', 'type')),
    fileName: stringValue(pick(record, 'fileName', 'file_name', 'filename'), 'file-import'),
    status: normalizeJobStatus(record.status),
    totalRows: numberValue(pick(record, 'totalRows', 'total_rows')),
    validRows: numberValue(pick(record, 'validRows', 'valid_rows')),
    warningRows: numberValue(pick(record, 'warningRows', 'warning_rows', 'warnings')),
    errorRows: numberValue(pick(record, 'errorRows', 'error_rows', 'invalidRows', 'invalid_rows')),
    importedRows: numberValue(
      pick(record, 'importedRows', 'imported_rows', 'successfulRows', 'successful_rows'),
    ),
    failedRows: numberValue(pick(record, 'failedRows', 'failed_rows')),
    uploadedAt: stringValue(pick(record, 'uploadedAt', 'uploaded_at', 'createdAt', 'created_at')),
    completedAt: completedAt === undefined ? null : stringValue(completedAt) || null,
    errorMessage: errorMessage === undefined ? null : stringValue(errorMessage) || null,
    uploadedBy: stringValue(
      pick(
        record,
        'uploadedBy',
        'uploaded_by',
        'requestedByName',
        'requested_by_name',
        'importedBy',
        'imported_by',
        'userName',
        'user_name',
      ),
    ) || undefined,
  }
}

const normalizeIssue = (value: unknown): ImportIssue => {
  const record = asRecord(value)
  const severity = stringValue(record.severity).toLowerCase() === 'warning' ? 'warning' : 'error'
  return {
    field: stringValue(pick(record, 'field', 'column'), 'row'),
    value: pick(record, 'value', 'invalidValue', 'invalid_value'),
    severity,
    code: stringValue(pick(record, 'code', 'errorCode', 'error_code')),
    message: stringValue(pick(record, 'message', 'errorMessage', 'error_message'), 'Data tidak valid.'),
  }
}

const normalizeRowStatus = (
  value: unknown,
  isDuplicate: boolean,
  issues: ImportIssue[],
): ImportRowStatus => {
  const status = stringValue(value).trim().toLowerCase()
  if (status === 'error' || status === 'invalid') return 'error'
  if (isDuplicate || status === 'duplicate') return 'duplicate'
  if (status === 'warning' || issues.some((issue) => issue.severity === 'warning')) return 'warning'
  if (issues.some((issue) => issue.severity === 'error')) return 'error'
  return 'valid'
}

const normalizeRow = (value: unknown): ImportPreviewRow => {
  const record = asRecord(value)
  const issues = asArray(record.issues).map(normalizeIssue)
  const isDuplicate = booleanValue(pick(record, 'isDuplicate', 'is_duplicate'))
  const rowNumber = Math.max(1, numberValue(pick(record, 'rowNumber', 'row_number'), 1))
  const id = pick(record, 'id', 'rowId', 'row_id')

  return {
    id: typeof id === 'number' || typeof id === 'string' ? id : rowNumber,
    rowNumber,
    status: normalizeRowStatus(record.status, isDuplicate, issues),
    reference: stringValue(pick(record, 'reference', 'referenceNumber', 'reference_number')),
    description: stringValue(record.description),
    isDuplicate,
    data: asRecord(pick(record, 'data', 'values', 'rawData', 'raw_data')),
    issues,
  }
}

const fileNameFromHeader = (header?: string) => {
  const match = header?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)
  return match ? decodeURIComponent(match[1]) : undefined
}

const downloadBlob = async (url: string, fallbackName: string) => {
  const response = await api.get<Blob>(url, { responseType: 'blob', timeout: 120_000 })
  const objectUrl = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileNameFromHeader(response.headers['content-disposition']) ?? fallbackName
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export const dataImportService = {
  config: async () => {
    const response = await api.get(API_ENDPOINTS.imports + '/config')
    return asArray(unwrapData(response.data)).map(normalizeConfig)
  },

  history: async (params: ListQuery = {}) => {
    const response = await api.get(API_ENDPOINTS.imports, { params })
    const rows = asArray(unwrapData(response.data)).map(normalizeJob)
    return { data: rows, meta: normalizeMeta(asRecord(response.data).meta, rows.length) }
  },

  preview: async (importType: ImportType, file: File): Promise<ImportPreviewResult> => {
    const body = new FormData()
    body.append('import_type', importType)
    body.append('file', file)
    const response = await api.post(API_ENDPOINTS.imports + '/preview', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    })
    const payload = asRecord(unwrapData(response.data))
    const rows = asArray(payload.rows).map(normalizeRow)
    return {
      job: normalizeJob(payload.job),
      rows,
      meta: normalizeMeta(payload.meta, rows.length),
    }
  },

  get: async (id: ImportJobId) => {
    const response = await api.get(`${API_ENDPOINTS.imports}/${id}`)
    return normalizeJob(unwrapData(response.data))
  },

  rows: async (id: ImportJobId, params: ListQuery = {}) => {
    const response = await api.get(`${API_ENDPOINTS.imports}/${id}/rows`, { params })
    const rows = asArray(unwrapData(response.data)).map(normalizeRow)
    return { data: rows, meta: normalizeMeta(asRecord(response.data).meta, rows.length) }
  },

  confirm: async (id: ImportJobId, options: ConfirmImportOptions) => {
    const response = await api.post(
      `${API_ENDPOINTS.imports}/${id}/confirm`,
      {
        error_policy: options.errorPolicy,
        import_as: options.importAs,
        skip_duplicates: options.skipDuplicates,
      },
      { timeout: 120_000 },
    )
    return normalizeJob(unwrapData(response.data))
  },

  cancel: async (id: ImportJobId) => {
    const response = await api.post(`${API_ENDPOINTS.imports}/${id}/cancel`)
    return normalizeJob(unwrapData(response.data))
  },

  downloadTemplate: (type: ImportType, format: ImportFileFormat) =>
    downloadBlob(
      `${API_ENDPOINTS.imports}/templates/${type}?format=${format}`,
      `template-${type}.${format}`,
    ),

  downloadErrors: (id: ImportJobId, importNumber: string, format: ImportFileFormat) =>
    downloadBlob(
      `${API_ENDPOINTS.imports}/${id}/errors?format=${format}`,
      `${importNumber}-errors.${format}`,
    ),
}
