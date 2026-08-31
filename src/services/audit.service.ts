import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ListQuery, PaginatedResponse } from '@/types/api'
import type { AuditLogRecord } from '@/types/system'

export const auditService = {
  list: async (params: ListQuery = {}) =>
    (await api.get<PaginatedResponse<AuditLogRecord>>(API_ENDPOINTS.auditLogs, { params })).data,
}
