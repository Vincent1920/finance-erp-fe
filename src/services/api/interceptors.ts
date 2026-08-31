import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios'

import type { ApiErrorResponse } from '@/types/api'
import { API_ENDPOINTS } from './endpoints'

import {
  getStoredToken,
  removeStoredToken,
} from '@/utils/auth-storage'

function attachToken(
  config: InternalAxiosRequestConfig,
) {
  const token = getStoredToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
}

function handleError(
  error: AxiosError<ApiErrorResponse>,
) {
  const status = error.response?.status
  const requestUrl = error.config?.url ?? ''

  const isLoginRequest =
    requestUrl === API_ENDPOINTS.auth.login ||
    requestUrl.endsWith(API_ENDPOINTS.auth.login)

  if (status === 401) {
    removeStoredToken()

    // Login gagal karena credential salah:
    // biarkan LoginView yang menampilkan pesan error.
    if (
      !isLoginRequest &&
      window.location.pathname !== '/login'
    ) {
      window.location.assign('/login')
    }
  }

  if (!isLoginRequest && status === 403) {
    window.dispatchEvent(
      new CustomEvent('api:forbidden', {
        detail: error.response?.data,
      }),
    )
  }

  if (!isLoginRequest && status === 422) {
    window.dispatchEvent(
      new CustomEvent('api:validation', {
        detail: error.response?.data,
      }),
    )
  }

  if (
    !isLoginRequest &&
    status !== undefined &&
    status >= 500
  ) {
    window.dispatchEvent(
      new CustomEvent('api:server-error', {
        detail: error.response?.data,
      }),
    )
  }

  return Promise.reject(error)
}

export function registerInterceptors(
  client: AxiosInstance,
) {
  client.interceptors.request.use(attachToken)

  client.interceptors.response.use(
    (response) => response,
    handleError,
  )
}
