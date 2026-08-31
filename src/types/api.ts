export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: PaginationMeta
}
export interface ApiErrorResponse {
  success: false
  message: string
  errors?: Record<string, string[]>
  requestId?: string
}
export type RequestState = 'idle' | 'loading' | 'success' | 'error'

export type QueryValue = string | number | boolean | null | undefined

export interface ListQuery {
  page?: number
  limit?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
  [key: string]: QueryValue
}
