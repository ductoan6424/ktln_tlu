import type { SchoolIdentityStatus, UserRole } from "@prisma/client"

export type SchoolIdentityImportMode = "CREATE" | "UPDATE_EXISTING"

export type SchoolIdentityImportInput = {
  rowNumber: number
  code: string | null
  role: UserRole
  displayName: string
  department: string
  status: SchoolIdentityStatus
  className: string | null
  cohort: string | null
  jobTitle: string | null
}

export type SchoolIdentityImportError = {
  rowNumber: number
  field: string
  message: string
}

const REQUIRED_HEADERS_BY_MODE: Record<SchoolIdentityImportMode, string[]> = {
  CREATE: ["role", "displayName", "department"],
  UPDATE_EXISTING: ["code", "role", "displayName", "department"],
}

const HEADER_ALIASES = new Map<string, string>([
  ["role", "role"],
  ["vai tro", "role"],
  ["vaitro", "role"],
  ["displayname", "displayName"],
  ["display name", "displayName"],
  ["full name", "displayName"],
  ["fullname", "displayName"],
  ["ho ten", "displayName"],
  ["hoten", "displayName"],
  ["department", "department"],
  ["khoa", "department"],
  ["phong ban", "department"],
  ["phongban", "department"],
  ["status", "status"],
  ["trang thai", "status"],
  ["trangthai", "status"],
  ["classname", "className"],
  ["class name", "className"],
  ["lop", "className"],
  ["cohort", "cohort"],
  ["khoa hoc", "cohort"],
  ["khoahoc", "cohort"],
  ["jobtitle", "jobTitle"],
  ["job title", "jobTitle"],
  ["chuc danh", "jobTitle"],
  ["chucdanh", "jobTitle"],
  ["code", "code"],
  ["ma", "code"],
])

function cellToString(value: unknown) {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function normalizeHeader(value: unknown) {
  return cellToString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function canonicalHeader(value: unknown) {
  const normalized = normalizeHeader(value)
  return HEADER_ALIASES.get(normalized) ?? HEADER_ALIASES.get(normalized.replace(/\s+/g, "")) ?? normalized
}

function normalizeNullable(value: unknown) {
  const text = cellToString(value)
  return text.length > 0 ? text : null
}

function normalizeRole(value: unknown): UserRole | null {
  const text = cellToString(value).toUpperCase()
  if (text === "STUDENT" || text === "LECTURER" || text === "ADMIN") return text
  if (text === "SINH VIEN" || text === "SINHVIEN") return "STUDENT"
  if (text === "GIANG VIEN" || text === "GIANGVIEN") return "LECTURER"
  if (text === "QUAN TRI" || text === "QUANTRI" || text === "CAN BO" || text === "CANBO") return "ADMIN"
  return null
}

function normalizeStatus(value: unknown): SchoolIdentityStatus | null {
  const text = cellToString(value).toUpperCase()
  if (!text) return "ACTIVE"
  if (text === "ACTIVE" || text === "INACTIVE") return text
  return null
}

export function parseSchoolIdentityImportRows(
  rows: unknown[][],
  mode: SchoolIdentityImportMode,
  options: { defaultRole?: Extract<UserRole, "STUDENT" | "LECTURER"> } = {},
) {
  const errors: SchoolIdentityImportError[] = []
  const records: SchoolIdentityImportInput[] = []
  const headerRow = rows[0] ?? []
  const headers = headerRow.map(canonicalHeader)
  const requiredHeaders =
    mode === "CREATE" && options.defaultRole
      ? REQUIRED_HEADERS_BY_MODE.CREATE.filter((header) => header !== "role")
      : REQUIRED_HEADERS_BY_MODE[mode]

  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      errors.push({
        rowNumber: 1,
        field: requiredHeader,
        message: `Thiếu cột bắt buộc: ${requiredHeader}`,
      })
    }
  }

  if (errors.length > 0) {
    return { records, errors }
  }

  const indexByHeader = new Map(headers.map((header, index) => [header, index]))
  const getValue = (row: unknown[], header: string) => row[indexByHeader.get(header) ?? -1]

  for (const [rowIndex, row] of rows.slice(1).entries()) {
    const rowNumber = rowIndex + 2
    if (row.every((value) => cellToString(value).length === 0)) continue

    const role = normalizeRole(getValue(row, "role")) ?? (mode === "CREATE" ? options.defaultRole ?? null : null)
    const status = normalizeStatus(getValue(row, "status"))
    const displayName = cellToString(getValue(row, "displayName"))
    const department = cellToString(getValue(row, "department"))

    if (!role) {
      errors.push({ rowNumber, field: "role", message: "Vai trò không hợp lệ" })
      continue
    }
    if (!status) {
      errors.push({ rowNumber, field: "status", message: "Trạng thái không hợp lệ" })
      continue
    }
    if (!displayName) {
      errors.push({ rowNumber, field: "displayName", message: "Họ tên không được để trống" })
      continue
    }
    if (!department) {
      errors.push({ rowNumber, field: "department", message: "Khoa/phòng ban không được để trống" })
      continue
    }

    records.push({
      rowNumber,
      code: normalizeNullable(getValue(row, "code"))?.toUpperCase() ?? null,
      role,
      displayName,
      department,
      status,
      className: normalizeNullable(getValue(row, "className")),
      cohort: normalizeNullable(getValue(row, "cohort")),
      jobTitle: normalizeNullable(getValue(row, "jobTitle")),
    })
  }

  return { records: errors.length > 0 ? [] : records, errors }
}
