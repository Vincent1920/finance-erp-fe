import api from './api/client'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { EntityRecord } from '@/types/master'

export interface EntityService<T extends EntityRecord> {
  list: (params?: ListQuery) => Promise<PaginatedResponse<T>>
  get: (id: number) => Promise<T>
  create: (payload: Record<string, unknown>) => Promise<T>
  update: (id: number, payload: Record<string, unknown>) => Promise<T>
  remove: (id: number) => Promise<string>
}

export const createEntityService = <T extends EntityRecord>(endpoint: string): EntityService<T> => ({
  list: async (params = {}) =>
    (await api.get<PaginatedResponse<T>>(endpoint, { params })).data,
  get: async (id) => (await api.get<ApiResponse<T>>(`${endpoint}/${id}`)).data.data,
  create: async (payload) =>
    (await api.post<ApiResponse<T>>(endpoint, payload)).data.data,
  update: async (id, payload) =>
    (await api.put<ApiResponse<T>>(`${endpoint}/${id}`, payload)).data.data,
  remove: async (id) =>
    (await api.delete<ApiResponse<null>>(`${endpoint}/${id}`)).data.message ??
    'Data berhasil dinonaktifkan',
})
