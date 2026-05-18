import { describe, expect, it, vi, beforeEach } from "vitest"

import { prisma } from "@/lib/prisma/client"
import {
  getEventRuntimeStatus,
  listPublicEvents,
  listUpcomingEventsForSidebar,
} from "@/lib/events/queries"

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const baseEvent = {
  id: "event-1",
  title: "Hackathon TLU",
  description: "Cuoc thi lap trinh 48 gio",
  type: "ACADEMIC",
  location: "Hoi truong A1",
  coverImageUrl: null,
  organizerName: "CLB Tin hoc",
  startAt: new Date("2026-06-01T01:00:00.000Z"),
  endAt: new Date("2026-06-01T10:00:00.000Z"),
  capacity: 120,
  registrationStatus: "OPEN",
  status: "PUBLISHED",
  featured: true,
  createdAt: new Date("2026-05-01T01:00:00.000Z"),
  _count: { registrations: 17 },
  registrations: [{ userId: "user-1" }],
}

describe("events queries", () => {
  it("computes event runtime status from start and end dates", () => {
    expect(
      getEventRuntimeStatus({
        startAt: new Date("2026-06-01T01:00:00.000Z"),
        endAt: new Date("2026-06-01T03:00:00.000Z"),
        now: new Date("2026-05-31T23:00:00.000Z"),
      }),
    ).toBe("upcoming")

    expect(
      getEventRuntimeStatus({
        startAt: new Date("2026-06-01T01:00:00.000Z"),
        endAt: new Date("2026-06-01T03:00:00.000Z"),
        now: new Date("2026-06-01T02:00:00.000Z"),
      }),
    ).toBe("ongoing")

    expect(
      getEventRuntimeStatus({
        startAt: new Date("2026-06-01T01:00:00.000Z"),
        endAt: new Date("2026-06-01T03:00:00.000Z"),
        now: new Date("2026-06-01T04:00:00.000Z"),
      }),
    ).toBe("past")
  })

  it("lists published events with counts and viewer registration state", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValueOnce([baseEvent] as never)

    const events = await listPublicEvents({
      viewerId: "user-1",
      now: new Date("2026-05-17T00:00:00.000Z"),
    })

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          status: "PUBLISHED",
        }),
        orderBy: [{ featured: "desc" }, { startAt: "asc" }],
      }),
    )
    expect(events).toEqual([
      expect.objectContaining({
        id: "event-1",
        title: "Hackathon TLU",
        attendeeCount: 17,
        isRegistered: true,
        runtimeStatus: "upcoming",
      }),
    ])
  })

  it("lists only upcoming sidebar events and limits the result", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValueOnce([baseEvent] as never)

    const events = await listUpcomingEventsForSidebar({
      take: 2,
      now: new Date("2026-05-17T00:00:00.000Z"),
    })

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
        where: expect.objectContaining({
          deletedAt: null,
          status: "PUBLISHED",
          startAt: { gte: new Date("2026-05-17T00:00:00.000Z") },
        }),
      }),
    )
    expect(events[0]).toEqual(
      expect.objectContaining({
        month: "Thg 6",
        day: "01",
        title: "Hackathon TLU",
        time: "08:00",
      }),
    )
  })
})
