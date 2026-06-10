import type {
  EventRegistrationStatus,
  EventStatus,
  EventType,
} from "@prisma/client"
import type { Prisma } from "@prisma/client"

import { unstableCache } from "@/lib/cache/unstable-cache"
import { prisma } from "@/lib/prisma/client"

export type EventRuntimeStatus = "upcoming" | "ongoing" | "past"

export type EventListItem = {
  id: string
  title: string
  description: string
  type: EventType
  typeLabel: string
  location: string
  coverImageUrl: string | null
  organizerName: string
  startAt: string
  endAt: string
  dateLabel: string
  timeLabel: string
  month: string
  day: string
  capacity: number | null
  attendeeCount: number
  registrationStatus: EventRegistrationStatus
  status: EventStatus
  runtimeStatus: EventRuntimeStatus
  featured: boolean
  isRegistered: boolean
}

export type EventSidebarItem = {
  id: string
  month: string
  day: string
  title: string
  location: string
  time: string
}

export type AdminEventItem = EventListItem & {
  createdAt: string
  publishedAt: string | null
  cancelledAt: string | null
}

const TYPE_LABELS: Record<EventType, string> = {
  ACADEMIC: "Học thuật",
  CLUB: "Câu lạc bộ",
  WORKSHOP: "Hội thảo",
  INTERNAL: "Nội bộ",
  SPORTS: "Thể thao",
  CULTURE: "Văn hóa",
  CAREER: "Nghề nghiệp",
  OTHER: "Khác",
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Bangkok",
})

const TIME_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Bangkok",
})

function formatMonth(date: Date) {
  return `Thg ${date.getMonth() + 1}`
}

function formatDay(date: Date) {
  return String(date.getDate()).padStart(2, "0")
}

function formatDateLabel(date: Date) {
  return DATE_TIME_FORMAT.format(date)
}

function formatTimeRange(startAt: Date, endAt: Date) {
  return `${TIME_FORMAT.format(startAt)} - ${TIME_FORMAT.format(endAt)}`
}

export function getEventRuntimeStatus(input: {
  startAt: Date
  endAt: Date
  now?: Date
}): EventRuntimeStatus {
  const now = input.now ?? new Date()
  if (input.startAt.getTime() > now.getTime()) return "upcoming"
  if (input.endAt.getTime() < now.getTime()) return "past"
  return "ongoing"
}

type EventRow = {
  id: string
  title: string
  description: string
  type: EventType
  location: string
  coverImageUrl: string | null
  organizerName: string
  startAt: Date
  endAt: Date
  capacity: number | null
  registrationStatus: EventRegistrationStatus
  status: EventStatus
  featured: boolean
  createdAt?: Date
  publishedAt?: Date | null
  cancelledAt?: Date | null
  _count: { registrations: number }
  registrations?: Array<{ userId: string }>
}

function toEventListItem(row: EventRow, now: Date): EventListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    typeLabel: TYPE_LABELS[row.type],
    location: row.location,
    coverImageUrl: row.coverImageUrl,
    organizerName: row.organizerName,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    dateLabel: formatDateLabel(row.startAt),
    timeLabel: formatTimeRange(row.startAt, row.endAt),
    month: formatMonth(row.startAt),
    day: formatDay(row.startAt),
    capacity: row.capacity,
    attendeeCount: row._count.registrations,
    registrationStatus: row.registrationStatus,
    status: row.status,
    runtimeStatus: getEventRuntimeStatus({
      startAt: row.startAt,
      endAt: row.endAt,
      now,
    }),
    featured: row.featured,
    isRegistered: (row.registrations?.length ?? 0) > 0,
  }
}

export async function listPublicEvents(params: {
  viewerId?: string | null
  now?: Date
  take?: number
} = {}): Promise<EventListItem[]> {
  const now = params.now ?? new Date()
  const rows = await prisma.event.findMany({
    where: {
      deletedAt: null,
      status: "PUBLISHED",
    },
    include: {
      _count: {
        select: {
          registrations: { where: { status: "REGISTERED" } },
        },
      },
      registrations: params.viewerId
        ? {
            where: { userId: params.viewerId, status: "REGISTERED" },
            select: { userId: true },
          }
        : false,
    },
    orderBy: [{ featured: "desc" }, { startAt: "asc" }],
    take: params.take,
  })

  return rows.map((row) => toEventListItem(row, now))
}

async function loadUpcomingEventsForSidebar(params: {
  now?: Date
  take?: number
} = {}): Promise<EventSidebarItem[]> {
  const now = params.now ?? new Date()
  const rows = await prisma.event.findMany({
    where: {
      deletedAt: null,
      status: "PUBLISHED",
      startAt: { gte: now },
    },
    include: {
      _count: {
        select: {
          registrations: { where: { status: "REGISTERED" } },
        },
      },
    },
    orderBy: [{ featured: "desc" }, { startAt: "asc" }],
    take: params.take,
  })

  return rows.map((row) => ({
    id: row.id,
    month: formatMonth(row.startAt),
    day: formatDay(row.startAt),
    title: row.title,
    location: row.location,
    time: TIME_FORMAT.format(row.startAt),
  }))
}

const listCachedUpcomingEventsForSidebar = unstableCache(
  async (take?: number) => loadUpcomingEventsForSidebar({ take }),
  ["upcoming-events-sidebar"],
  { revalidate: 60 },
)

export async function listUpcomingEventsForSidebar(params: {
  now?: Date
  take?: number
} = {}): Promise<EventSidebarItem[]> {
  if (params.now) {
    return loadUpcomingEventsForSidebar(params)
  }

  return listCachedUpcomingEventsForSidebar(params.take)
}

export async function listAdminEvents(params: {
  now?: Date
  query?: string
  status?: EventStatus | "all"
} = {}): Promise<AdminEventItem[]> {
  const now = params.now ?? new Date()
  const query = params.query?.trim()
  const where: Prisma.EventWhereInput = {
    deletedAt: null,
    ...(params.status && params.status !== "all" ? { status: params.status } : {}),
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { organizerName: { contains: query, mode: "insensitive" } },
      { location: { contains: query, mode: "insensitive" } },
    ]
  }

  const rows = await prisma.event.findMany({
    where,
    include: {
      _count: {
        select: {
          registrations: { where: { status: "REGISTERED" } },
        },
      },
    },
    orderBy: [{ startAt: "desc" }],
  })

  return rows.map((row) => ({
    ...toEventListItem(row, now),
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
  }))
}

export async function getAdminEventById(id: string): Promise<AdminEventItem | null> {
  const row = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registrations: { where: { status: "REGISTERED" } },
        },
      },
    },
  })

  if (!row || row.deletedAt) return null

  return {
    ...toEventListItem(row, new Date()),
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
  }
}
