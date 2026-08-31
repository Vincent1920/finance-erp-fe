import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { ErrorLogRecord } from '@/types/system'

export const errorLogService = {
  list: async (params: ListQuery = {}) =>
    (await api.get<PaginatedResponse<ErrorLogRecord>>(API_ENDPOINTS.errorLogs, { params })).data,
  get: async (id: number) =>
    (await api.get<ApiResponse<ErrorLogRecord>>(`${API_ENDPOINTS.errorLogs}/${id}`)).data.data,
  resolve: async (id: number) =>
    (
      await api.patch<ApiResponse<ErrorLogRecord>>(`${API_ENDPOINTS.errorLogs}/${id}/resolve`)
    ).data.data,
}
