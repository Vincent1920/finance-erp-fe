import axios from 'axios'
import type { ApiErrorResponse } from '@/types/api'

interface LoginErrorPayload {
  message?: unknown
  error?: {
    message?: unknown
  }
}

const LOGIN_ERROR_FALLBACKS: Record<number, string> = {
  400: 'Data login tidak valid. Periksa email dan password.',
  401: 'Email atau password salah.',
  403: 'Akun Anda tidak memiliki akses ke sistem.',
  404: 'Layanan login tidak ditemukan.',
  422: 'Email atau password tidak valid.',
  429: 'Terlalu banyak percobaan login. Silakan coba lagi beberapa saat.',
  500: 'Terjadi kesalahan pada server. Silakan coba lagi.',
  502: 'Server sedang tidak tersedia. Silakan coba lagi nanti.',
  503: 'Server sedang tidak tersedia. Silakan coba lagi nanti.',
  504: 'Server sedang tidak tersedia. Silakan coba lagi nanti.',
}

const GENERIC_ERROR_MESSAGES = [
  /^network error$/i,
  /^failed to fetch$/i,
  /^timeout(?: of \d+ms)? exceeded$/i,
  /^request failed with status code \d+$/i,
  /^validation failed$/i,
  /^internal server error$/i,
  /^login failed$/i,
  /^unexpected login response$/i,
]

const UNSAFE_ERROR_PATTERN =
  /\b(?:stack(?:\s*trace)?|exception|syntaxerror|typeerror|referenceerror|mysql|postgres(?:ql)?|sqlite|sequelize|typeorm|prisma|bcrypt|jwt)\b|(?:[a-z]:[\\/]|\/(?:app|home|usr|var|src|node_modules)[\\/])|\b(?:select|insert|update|delete|drop|alter|create)\s+(?:\*|from|into|table|database)\b|\b(?:secret|credential|password|token)\s*[:=]/i

const getSafeMessage = (value: unknown) => {
  if (typeof value !== 'string') return undefined

  const message = value.trim()
  if (!message || message.length > 300) return undefined
  if (GENERIC_ERROR_MESSAGES.some((pattern) => pattern.test(message))) return undefined
  if (UNSAFE_ERROR_PATTERN.test(message)) return undefined

  return message
}

const getLoginResponseMessage = (data: unknown) => {
  if (!data || typeof data !== 'object') return undefined

  const payload = data as LoginErrorPayload
  return getSafeMessage(payload.message) ?? getSafeMessage(payload.error?.message)
}

const isTimeoutError = (error: { code?: string; message?: string }) =>
  error.code === 'ECONNABORTED' ||
  error.code === 'ETIMEDOUT' ||
  /timeout/i.test(error.message ?? '')

export function getLoginErrorMessage(error: unknown) {
  if (axios.isAxiosError<unknown>(error)) {
    const responseMessage = getLoginResponseMessage(error.response?.data)
    if (responseMessage) return responseMessage

    if (isTimeoutError(error)) return 'Koneksi ke server terlalu lama. Silakan coba lagi.'

    if (!error.response) return 'Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.'

    const errorMessage = getSafeMessage(error.message)
    if (errorMessage) return errorMessage

    const status = error.response?.status
    if (status && LOGIN_ERROR_FALLBACKS[status]) return LOGIN_ERROR_FALLBACKS[status]
  }

  const errorMessage = error instanceof Error ? getSafeMessage(error.message) : undefined
  return errorMessage ?? 'Login gagal. Terjadi kesalahan yang tidak diketahui.'
}

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
