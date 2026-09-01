import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { AuditLogRecord } from '@/types/system'

export const auditService = {
  list: async (params: ListQuery = {}) =>
    (await api.get<PaginatedResponse<AuditLogRecord>>(API_ENDPOINTS.auditLogs, { params })).data,
  get: async (id: number) =>
    (await api.get<ApiResponse<AuditLogRecord>>(`${API_ENDPOINTS.auditLogs}/${id}`)).data.data,
}
