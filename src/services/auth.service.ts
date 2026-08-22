import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'
import type { ApiResponse } from '@/types/api'
import type { User } from '@/types/auth'
export interface AuthenticatedUser extends User {
  roles: string[]
  permissions: string[]
}
export interface LoginResult {
  token: string
  user: AuthenticatedUser
}
export const authService = {
  login: async (email: string, password: string) =>
    (await api.post<ApiResponse<LoginResult>>(API_ENDPOINTS.auth.login, { email, password })).data
      .data,
  me: async () => (await api.get<ApiResponse<AuthenticatedUser>>(API_ENDPOINTS.auth.me)).data.data,
  logout: async () => api.post(API_ENDPOINTS.auth.logout),
}
