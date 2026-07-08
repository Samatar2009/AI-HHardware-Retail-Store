export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
}

export interface PaginatedResponse<T> {
  data: T[]
  error: ApiError | null
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}
