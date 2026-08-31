import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export interface AttachmentRecord {
  id: number
  entity_type: string
  entity_id: number
  original_name: string
  mime_type: string
  size: number
  created_at: string
}

export const attachmentService = {
  list: async (entityType: string, entityId: number) =>
    (
      await api.get<PaginatedResponse<AttachmentRecord>>(API_ENDPOINTS.attachments, {
        params: { entity_type: entityType, entity_id: entityId },
      })
    ).data,
  upload: async (entityType: string, entityId: number, file: File) => {
    const body = new FormData()
    body.append('entity_type', entityType)
    body.append('entity_id', String(entityId))
    body.append('file', file)
    return (
      await api.post<ApiResponse<AttachmentRecord>>(API_ENDPOINTS.attachments, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data.data
  },
  remove: async (id: number) => api.delete(`${API_ENDPOINTS.attachments}/${id}`),
}
