import type Redis from "ioredis"

import { redis } from "@/lib/redis/client"
import {
  announcementDigestDtoSchema,
  type AnnouncementDigestDto,
} from "@/lib/ai-digest/schema"

export type AiDigestErrorCode =
  | "UNAVAILABLE"
  | "RATE_LIMITED"
  | "INVALID_PROVIDER_RESPONSE"

export class AiDigestError extends Error {
  readonly code: AiDigestErrorCode

  constructor(message: string, code: AiDigestErrorCode) {
    super(message)
    this.name = "AiDigestError"
    this.code = code
  }
}

const UNAVAILABLE_MESSAGE = "Tinh nang AI tam thoi chua kha dung."
const RATE_LIMITED_MESSAGE = "Ban da vuot qua gioi han AI digest trong ngay."

const DAILY_QUOTA_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
return count
`.trim()

function unavailableError() {
  return new AiDigestError(UNAVAILABLE_MESSAGE, "UNAVAILABLE")
}

function getZonedCalendarDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    throw unavailableError()
  }

  return `${year}-${month}-${day}`
}

function secondsUntilNextZonedDay(now: Date, timeZone: string) {
  const nowMs = now.getTime()
  const currentDate = getZonedCalendarDate(now, timeZone)
  let low = nowMs
  let high = nowMs + 48 * 60 * 60 * 1000

  while (getZonedCalendarDate(new Date(high), timeZone) === currentDate) {
    high += 24 * 60 * 60 * 1000
  }

  while (high - low > 1000) {
    const mid = Math.floor((low + high) / 2)
    if (getZonedCalendarDate(new Date(mid), timeZone) === currentDate) {
      low = mid
    } else {
      high = mid
    }
  }

  return Math.max(1, Math.ceil((high - nowMs) / 1000)) + 60
}

export async function readCachedDigest(
  key: string,
  client: Pick<Redis, "get"> = redis,
): Promise<AnnouncementDigestDto | null> {
  try {
    const raw = await client.get(key)
    if (raw === null) return null

    const parsedJson = JSON.parse(raw) as unknown
    return announcementDigestDtoSchema.parse(parsedJson)
  } catch {
    throw unavailableError()
  }
}

export async function cacheDigest(
  key: string,
  dto: AnnouncementDigestDto,
  ttlSeconds: number,
  client: Pick<Redis, "set"> = redis,
): Promise<void> {
  try {
    await client.set(key, JSON.stringify(dto), "EX", ttlSeconds)
  } catch {
    throw unavailableError()
  }
}

export async function consumeDailyDigestQuota(params: {
  userId: string
  dailyLimit: number
  timeZone: string
  now?: Date
  client?: Pick<Redis, "eval">
}): Promise<void> {
  const { userId, dailyLimit, timeZone, now = new Date(), client = redis } = params

  try {
    if (!Number.isInteger(dailyLimit) || dailyLimit <= 0) {
      throw unavailableError()
    }

    const zonedDate = getZonedCalendarDate(now, timeZone)
    const expirySeconds = secondsUntilNextZonedDay(now, timeZone)
    const key = `ai-digest:daily-quota:${userId}:${zonedDate}`
    const result = await client.eval(DAILY_QUOTA_SCRIPT, 1, key, expirySeconds)
    const count = Number(result)

    if (!Number.isInteger(count)) {
      throw unavailableError()
    }

    if (count > dailyLimit) {
      throw new AiDigestError(RATE_LIMITED_MESSAGE, "RATE_LIMITED")
    }
  } catch (error) {
    if (error instanceof AiDigestError) {
      throw error
    }

    throw unavailableError()
  }
}
