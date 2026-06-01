import type { DigestRange } from "@/lib/ai-digest/schema"

export type NormalizedDigestRange = {
  start: Date
  end: Date
}

type CalendarDate = {
  year: number
  month: number
  day: number
}

type LocalDateTime = CalendarDate & {
  hour: number
  minute: number
  second: number
  millisecond: number
}

const localDateTimeFormatterOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
}

function parseCalendarDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error("Ngày tùy chỉnh phải có định dạng YYYY-MM-DD")
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
    throw new Error("Ngày tùy chỉnh không hợp lệ")
  }

  return { year, month, day }
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
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
  const localTime = Date.UTC(
    values.year!,
    values.month! - 1,
    values.day!,
    values.hour!,
    values.minute!,
    values.second!,
  )
  const utcTime = Math.floor(date.getTime() / 1000) * 1000

  return localTime - utcTime
}

function zonedLocalDateTimeToUtc(value: LocalDateTime, timeZone: string): Date {
  const localTime = Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
    value.millisecond,
  )
  let utcTime = localTime

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offset = getTimeZoneOffsetMilliseconds(new Date(utcTime), timeZone)
    const adjustedUtcTime = localTime - offset

    if (adjustedUtcTime === utcTime) break
    utcTime = adjustedUtcTime
  }

  return new Date(utcTime)
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
    throw new Error("Ngày bắt đầu không được sau ngày kết thúc")
  }

  const oneYearAfterStart = new Date(comparableStart)
  oneYearAfterStart.setUTCFullYear(oneYearAfterStart.getUTCFullYear() + 1)
  if (comparableEnd > oneYearAfterStart) {
    throw new Error("Khoảng thời gian tùy chỉnh không được vượt quá một năm")
  }

  return {
    start: zonedLocalDateTimeToUtc({
      ...startDate,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    }, timeZone),
    end: zonedLocalDateTimeToUtc({
      ...endDate,
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    }, timeZone),
  }
}
