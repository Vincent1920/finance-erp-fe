import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { ApiResponse, ListQuery, PaginatedResponse } from '@/types/api'
import type { PermissionRecord, RoleRecord } from '@/types/system'

const baseService = createEntityService<RoleRecord>(API_ENDPOINTS.roles)

export const roleService = {
  ...baseService,
  assignPermissions: async (id: number, permissionIds: number[]) =>
    (
      await api.put<ApiResponse<RoleRecord>>(`${API_ENDPOINTS.roles}/${id}/permissions`, {
        permission_ids: permissionIds,
      })
    ).data.data,
}

export const permissionService = {
  list: async (params: ListQuery = { page: 1, limit: 500 }) => {
    const response = await api.get<PaginatedResponse<PermissionRecord> | ApiResponse<PermissionRecord[]>>(
      API_ENDPOINTS.permissions,
      { params },
    )
    const payload = response.data
    return 'meta' in payload ? payload.data : payload.data
  },
}
