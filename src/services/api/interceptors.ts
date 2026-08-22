import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorResponse } from '@/types/api'
const ACCESS_TOKEN_KEY = 'access_token'
function attachToken(config: InternalAxiosRequestConfig) {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}
function handleError(error: AxiosError<ApiErrorResponse>) {
  const status = error.response?.status
  if (status === 401) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.setItem('finora-auth', 'false')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }
  if (status === 403)
    window.dispatchEvent(new CustomEvent('api:forbidden', { detail: error.response?.data }))
  if (status === 422)
    window.dispatchEvent(new CustomEvent('api:validation', { detail: error.response?.data }))
  if (status && status >= 500)
    window.dispatchEvent(new CustomEvent('api:server-error', { detail: error.response?.data }))
  return Promise.reject(error)
}
export function registerInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(attachToken)
  client.interceptors.response.use((response) => response, handleError)
}
