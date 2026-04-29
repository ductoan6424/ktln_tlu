"use client"

import { useEffect, useMemo, useState } from "react"
import { formatRelativeTime } from "@/utils/formatters"

interface RelativeTimeProps {
  date: Date | string
  fallback?: string
  className?: string
  updateIntervalMs?: number
}

function parseDate(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function RelativeTime({
  date,
  fallback,
  className,
  updateIntervalMs = 30_000,
}: RelativeTimeProps) {
  const parsedDate = useMemo(() => parseDate(date), [date])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!parsedDate || updateIntervalMs <= 0) return

    const interval = window.setInterval(() => {
      setNow(new Date())
    }, updateIntervalMs)

    return () => window.clearInterval(interval)
  }, [parsedDate, updateIntervalMs])

  if (!parsedDate) {
    return <span className={className}>{fallback ?? String(date)}</span>
  }

  return (
    <time
      dateTime={parsedDate.toISOString()}
      className={className}
      suppressHydrationWarning
    >
      {formatRelativeTime(parsedDate, now)}
    </time>
  )
}
