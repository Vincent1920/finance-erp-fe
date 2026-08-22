import axios from 'axios'
import type { ApiErrorResponse } from '@/types/api'
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.',
) {
  if (!axios.isAxiosError<ApiErrorResponse>(error))
    return error instanceof Error ? error.message : fallback
  return error.response?.data?.message || fallback
}
export function getValidationErrors(error: unknown): Record<string, string[]> {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return {}
  return error.response?.status === 422 && error.response.data.errors
    ? error.response.data.errors
    : {}
}
