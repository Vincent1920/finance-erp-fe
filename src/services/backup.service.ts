import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { BackupRecord } from '@/types/system'

const fileNameFromHeader = (header?: string) => {
  const match = header?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)
  return match ? decodeURIComponent(match[1]) : undefined
}

export const backupService = {
  list: async (params: ListQuery = {}) =>
    (await api.get<PaginatedResponse<BackupRecord>>(API_ENDPOINTS.backups, { params })).data,
  create: async () =>
    (await api.post<ApiResponse<BackupRecord>>(API_ENDPOINTS.backups)).data.data,
  download: async (id: number, fallbackName: string) => {
    const response = await api.get<Blob>(`${API_ENDPOINTS.backups}/${id}/download`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = fileNameFromHeader(response.headers['content-disposition']) ?? fallbackName
    link.click()
    URL.revokeObjectURL(url)
  },
  restore: async (backup: unknown) =>
    (
      await api.post<ApiResponse<{ restore_number?: string }>>(`${API_ENDPOINTS.backups}/restore`, {
        backup,
      })
    ).data.data,
}
