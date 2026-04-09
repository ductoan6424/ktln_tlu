// Type definitions cho API request/response

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  message?: string
}

export function successResult<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function errorResult(error: string, code?: string): ActionResult {
  return { success: false, error, code }
}

// Kiểu response chuẩn cho API
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Kiểu pagination
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  totalPages: number
}
