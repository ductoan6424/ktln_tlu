const COMBINING_MARKS = /[\u0300-\u036f]/g
const WHITESPACE = /\s+/g

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(WHITESPACE, " ")
}

export function splitSearchTokens(value: string): string[] {
  const normalized = normalizeSearchText(value)
  return normalized ? normalized.split(" ") : []
}
