// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400)
    this.name = "ValidationError"
  }
}

export class AuthError extends AppError {
  constructor(message: string = "Vui lòng đăng nhập") {
    super(message, "AUTH_ERROR", 401)
    this.name = "AuthError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Bạn không có quyền thực hiện hành động này") {
    super(message, "FORBIDDEN", 403)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} không tồn tại`, "NOT_FOUND", 404)
    this.name = "NotFoundError"
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Lỗi cơ sở dữ liệu") {
    super(message, "DATABASE_ERROR", 500, false)
    this.name = "DatabaseError"
  }
}
