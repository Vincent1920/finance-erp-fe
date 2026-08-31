import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import { createEntityService } from './entity.service'
import type { ApiResponse } from '@/types/api'
import type { UserStatus } from '@/types/auth'
import type { SystemUser } from '@/types/system'

const baseService = createEntityService<SystemUser>(API_ENDPOINTS.users)

export const userService = {
  ...baseService,
  setStatus: async (id: number, status: UserStatus) =>
    (
      await api.patch<ApiResponse<SystemUser>>(`${API_ENDPOINTS.users}/${id}/status`, {
        status,
      })
    ).data.data,
  resetPassword: async (id: number, password: string) =>
    (
      await api.post<ApiResponse<null>>(`${API_ENDPOINTS.users}/${id}/reset-password`, {
        password,
      })
    ).data.message ?? 'Kata sandi berhasil direset',
  assignRoles: async (id: number, roleIds: number[]) =>
    (
      await api.put<ApiResponse<SystemUser>>(`${API_ENDPOINTS.users}/${id}/roles`, {
        role_ids: roleIds,
      })
    ).data.data,
}
