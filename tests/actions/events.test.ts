import { beforeEach, describe, expect, it, vi } from "vitest"

const revalidatePath = vi.hoisted(() => vi.fn())
const requireAdminPermission = vi.hoisted(() => vi.fn())
const getAuthorizationContext = vi.hoisted(() => vi.fn())

vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/auth/authorization", () => ({
  requireAdminPermission,
  getAuthorizationContext,
}))
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    event: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    eventRegistration: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { createEvent, registerForEvent } from "@/actions/events"
import { prisma } from "@/lib/prisma/client"

beforeEach(() => {
  vi.clearAllMocks()
  requireAdminPermission.mockResolvedValue({
    profile: { userId: "admin-1" },
  })
  getAuthorizationContext.mockResolvedValue({
    profile: { userId: "user-1" },
  })
})

describe("event actions", () => {
  it("creates a draft event from admin input and revalidates event surfaces", async () => {
    vi.mocked(prisma.event.create).mockResolvedValueOnce({
      id: "event-1",
      status: "DRAFT",
    } as never)

    const result = await createEvent({
      title: "Hackathon TLU",
      description: "Cuoc thi lap trinh 48 gio",
      type: "ACADEMIC",
      location: "Hoi truong A1",
      organizerName: "CLB Tin hoc",
      startAt: "2026-06-01T01:00:00.000Z",
      endAt: "2026-06-01T10:00:00.000Z",
      capacity: 120,
      registrationStatus: "OPEN",
      featured: true,
      coverImageUrl: "",
    })

    expect(result).toEqual({
      success: true,
      data: { id: "event-1", status: "DRAFT" },
    })
    expect(requireAdminPermission).toHaveBeenCalledWith("admin.events.manage")
    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Hackathon TLU",
        createdById: "admin-1",
        capacity: 120,
        coverImageUrl: null,
      }),
      select: { id: true, status: true },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/events")
    expect(revalidatePath).toHaveBeenCalledWith("/events")
    expect(revalidatePath).toHaveBeenCalledWith("/feed")
  })

  it("registers the current viewer when event is open and not full", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
      id: "event-1",
      status: "PUBLISHED",
      registrationStatus: "OPEN",
      capacity: 2,
      startAt: new Date("2026-06-01T01:00:00.000Z"),
      deletedAt: null,
      _count: { registrations: 1 },
    } as never)
    vi.mocked(prisma.eventRegistration.upsert).mockResolvedValueOnce({
      eventId: "event-1",
      userId: "user-1",
    } as never)

    const result = await registerForEvent("event-1")

    expect(result).toEqual({
      success: true,
      data: { eventId: "event-1", registered: true },
    })
    expect(prisma.eventRegistration.upsert).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: "event-1", userId: "user-1" } },
      update: { status: "REGISTERED", cancelledAt: null },
      create: { eventId: "event-1", userId: "user-1", status: "REGISTERED" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/events")
    expect(revalidatePath).toHaveBeenCalledWith("/feed")
  })

  it("rejects registration when capacity is full", async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
      id: "event-1",
      status: "PUBLISHED",
      registrationStatus: "OPEN",
      capacity: 1,
      startAt: new Date("2026-06-01T01:00:00.000Z"),
      deletedAt: null,
      _count: { registrations: 1 },
    } as never)

    const result = await registerForEvent("event-1")

    expect(result.success).toBe(false)
    expect(result.code).toBe("EVENT_FULL")
    expect(prisma.eventRegistration.upsert).not.toHaveBeenCalled()
  })
})
