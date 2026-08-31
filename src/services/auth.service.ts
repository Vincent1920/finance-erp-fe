import api from './api/client'
import { API_ENDPOINTS } from './api/endpoints'

import type { ApiResponse } from '@/types/api'
import type { User } from '@/types/auth'

import {
  removeStoredToken,
  saveToken,
} from '@/utils/auth-storage'

export interface AuthenticatedUser extends User {
  roles: string[]
  permissions: string[]
}

export interface LoginResult {
  token: string
  user: AuthenticatedUser
}

interface LoginResponse {
  success: boolean
  message?: string
  data?: LoginResult
}

const isLoginResult = (
  data: LoginResponse['data'],
): data is LoginResult =>
  Boolean(
    data &&
      typeof data.token === 'string' &&
      data.token.trim().length > 0 &&
      data.user &&
      typeof data.user.id === 'number' &&
      typeof data.user.name === 'string' &&
      typeof data.user.email === 'string' &&
      Array.isArray(data.user.roles) &&
      Array.isArray(data.user.permissions),
  )

export const authService = {
  async login(
    email: string,
    password: string,
    remember = true,
  ): Promise<LoginResult> {
    const response = await api.post<LoginResponse>(
      API_ENDPOINTS.auth.login,
      {
        email,
        password,
      },
    )

    const payload = response.data

    if (!payload.success) {
      throw new Error(payload.message || 'Login gagal')
    }

    if (!isLoginResult(payload.data)) {
      throw new Error('Unexpected login response')
    }

    saveToken(payload.data.token, remember)

    return payload.data
  },

  async me(): Promise<AuthenticatedUser> {
    const response =
      await api.get<ApiResponse<AuthenticatedUser>>(
        API_ENDPOINTS.auth.me,
      )

    return response.data.data
  },

  async logout(): Promise<void> {
    try {
      await api.post(API_ENDPOINTS.auth.logout)
    } finally {
      removeStoredToken()
    }
  },
}
