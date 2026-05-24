export function normalizeFacultyCode(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
}

export function parseCohortYear(value: string | null | undefined): number | null {
  if (!value) return null
  const digits = value.replace(/\D/g, "")
  if (!digits) return null
  const parsed = Number(digits)
  return Number.isInteger(parsed) ? parsed : null
}
