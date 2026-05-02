import { describe, it, expect, vi, beforeEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())

vi.mock("@/lib/supabase/server", () => ({ createClient }))

import {
  getMyUnreadNotificationCount,
  getNotificationSession,
  listMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/actions/notifications"

const mockNoSession = () => {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient)
}

const mockWithSession = (userId: string) => {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as unknown as SupabaseClient)
}

beforeEach(() => {
  createClient.mockClear()
})

describe("listMyNotifications", () => {
  it("trả UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await listMyNotifications({})
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })

  it("trả VALIDATION_ERROR khi cursor sai format", async () => {
    mockWithSession("user-a")
    const result = await listMyNotifications({
      cursor: { createdAt: "", id: "abc" },
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("trả VALIDATION_ERROR khi limit âm", async () => {
    mockWithSession("user-a")
    const result = await listMyNotifications({ limit: 0 })
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })
})

describe("getMyUnreadNotificationCount", () => {
  it("trả về 0 khi chưa login (không cần UNAUTHORIZED)", async () => {
    mockNoSession()
    const result = await getMyUnreadNotificationCount()
    expect(result.success).toBe(true)
    expect(result.data?.unreadCount).toBe(0)
  })
})

describe("getNotificationSession", () => {
  it("trả về null khi chưa login", async () => {
    mockNoSession()
    const result = await getNotificationSession()
    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })
})

describe("markNotificationAsRead", () => {
  it("trả UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await markNotificationAsRead("some-id")
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })

  it("trả VALIDATION_ERROR khi id rỗng", async () => {
    mockWithSession("user-a")
    const result = await markNotificationAsRead("")
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("trả VALIDATION_ERROR khi id toàn khoảng trắng", async () => {
    mockWithSession("user-a")
    const result = await markNotificationAsRead("   ")
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })
})

describe("markAllNotificationsAsRead", () => {
  it("trả UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await markAllNotificationsAsRead()
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })
})
