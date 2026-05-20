const STUDENT_CODE_HEADERS = new Set([
  "studentid",
  "student id",
  "studentcode",
  "student code",
  "student_id",
  "ma sinh vien",
  "masinhvien",
])

function cellToString(value: unknown) {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

export function normalizeImportHeader(value: unknown) {
  return cellToString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function findStudentCodeColumnIndex(headerRow: unknown[]) {
  return headerRow.findIndex((header) => {
    const normalized = normalizeImportHeader(header)
    return STUDENT_CODE_HEADERS.has(normalized) || STUDENT_CODE_HEADERS.has(normalized.replace(/\s+/g, ""))
  })
}

export function parseStudentCodesFromRows(rows: unknown[][]) {
  if (rows.length === 0) return []

  const headerIndex = findStudentCodeColumnIndex(rows[0] ?? [])
  const hasHeader = headerIndex >= 0
  const codeColumnIndex = hasHeader ? headerIndex : 0
  const dataRows = hasHeader ? rows.slice(1) : rows
  const seen = new Set<string>()
  const codes: string[] = []

  for (const row of dataRows) {
    const code = cellToString(row[codeColumnIndex]).toUpperCase()
    if (!code || seen.has(code)) continue
    seen.add(code)
    codes.push(code)
  }

  return codes
}

export function parseCsvRows(csvText: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index]
    const nextChar = csvText[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim())
      cell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1
      }
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) {
        rows.push(row)
      }
      row = []
      cell = ""
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) {
    rows.push(row)
  }

  return rows
}
