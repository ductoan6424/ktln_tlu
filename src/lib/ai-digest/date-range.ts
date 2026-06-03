import type { DigestRange } from "@/lib/ai-digest/schema"

export type NormalizedDigestRange = {
  start: Date
  end: Date
}

export class DigestRangeValidationError extends Error {
  readonly code = "VALIDATION_ERROR"

  constructor(message: string) {
    super(message)
    this.name = "DigestRangeValidationError"
  }
}

type CalendarDate = {
  year: number
  month: number
  day: number
}

const localDateTimeFormatterOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}

function parseCalendarDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new DigestRangeValidationError("Ngày tùy chỉnh phải có định dạng YYYY-MM-DD")
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new DigestRangeValidationError("Ngày tùy chỉnh không hợp lệ")
  }

  return { year, month, day }
}

function getCalendarDateKey(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    ...localDateTimeFormatterOptions,
    timeZone,
  })
  const parts = formatter.formatToParts(date)
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  )

  return values.year! * 10_000 + values.month! * 100 + values.day!
}

function findFirstInstantForCalendarDate(
  value: CalendarDate,
  timeZone: string,
  afterRequestedDate: boolean,
): Date {
  const requestedDateKey = value.year * 10_000 + value.month * 100 + value.day
  const targetDateKey = afterRequestedDate ? requestedDateKey + 1 : requestedDateKey
  const nominalTime = Date.UTC(value.year, value.month - 1, value.day)
  let lowerBound = nominalTime - 48 * 60 * 60 * 1000
  let upperBound = nominalTime + 48 * 60 * 60 * 1000

  while (lowerBound < upperBound) {
    const midpoint = Math.floor((lowerBound + upperBound) / 2)
    if (getCalendarDateKey(new Date(midpoint), timeZone) >= targetDateKey) {
      upperBound = midpoint
    } else {
      lowerBound = midpoint + 1
    }
  }

  return new Date(lowerBound)
}

function assertCalendarDateExists(value: CalendarDate, timeZone: string): void {
  const requestedDateKey = value.year * 10_000 + value.month * 100 + value.day
  const firstInstant = findFirstInstantForCalendarDate(value, timeZone, false)

  if (getCalendarDateKey(firstInstant, timeZone) !== requestedDateKey) {
    throw new DigestRangeValidationError("Ngày tùy chỉnh không tồn tại trong múi giờ đã cấu hình")
  }
}

function toComparableCalendarDate(value: CalendarDate): Date {
  return new Date(Date.UTC(value.year, value.month - 1, value.day))
}

export function normalizeDigestRange(
  range: DigestRange,
  timeZone: string,
  now = new Date(),
): NormalizedDigestRange {
  if (range.type === "preset") {
    const end = new Date(now)
    const start = new Date(now)
    start.setUTCDate(start.getUTCDate() - range.days)

    return { start, end }
  }

  const startDate = parseCalendarDate(range.startDate)
  const endDate = parseCalendarDate(range.endDate)
  const comparableStart = toComparableCalendarDate(startDate)
  const comparableEnd = toComparableCalendarDate(endDate)

  if (comparableStart > comparableEnd) {
    throw new DigestRangeValidationError("Ngày bắt đầu không được sau ngày kết thúc")
  }

  const oneYearAfterStart = new Date(comparableStart)
  oneYearAfterStart.setUTCFullYear(oneYearAfterStart.getUTCFullYear() + 1)
  const latestAllowedEnd = new Date(oneYearAfterStart)
  latestAllowedEnd.setUTCDate(latestAllowedEnd.getUTCDate() - 1)
  if (comparableEnd > latestAllowedEnd) {
    throw new DigestRangeValidationError("Khoảng thời gian tùy chỉnh không được vượt quá một năm")
  }

  assertCalendarDateExists(startDate, timeZone)
  assertCalendarDateExists(endDate, timeZone)

  const start = findFirstInstantForCalendarDate(startDate, timeZone, false)
  const end = findFirstInstantForCalendarDate(endDate, timeZone, true)
  end.setTime(end.getTime() - 1)

  return {
    start,
    end,
  }
}
