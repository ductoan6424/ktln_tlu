import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  pushSubscription: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getMyPushStatus,
  subscribePush,
  unsubscribePush,
} from "@/actions/push"

const mockNoSession = () => {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
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

const validSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc-123",
  keys: {
    p256dh: "BPublicKey",
    auth: "AuthSecret",
  },
  userAgent: "Mozilla/5.0 Test",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("subscribePush", () => {
  it("trả UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await subscribePush(validSubscription)
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
    expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled()
  })

  it("trả VALIDATION_ERROR khi endpoint không phải URL", async () => {
    mockWithSession("user-a")
    const result = await subscribePush({
      endpoint: "not-a-url",
      keys: { p256dh: "x", auth: "y" },
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("trả VALIDATION_ERROR khi thiếu keys", async () => {
    mockWithSession("user-a")
    const result = await subscribePush({
      endpoint: "https://example.com/push",
      keys: { p256dh: "", auth: "" },
    })
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("upsert subscription với user hiện tại khi input hợp lệ", async () => {
    mockWithSession("user-a")
    prisma.pushSubscription.upsert.mockResolvedValue({ id: "sub-1" })

    const result = await subscribePush(validSubscription)

    expect(result.success).toBe(true)
    expect(result.data?.id).toBe("sub-1")
    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { endpoint: validSubscription.endpoint },
        create: expect.objectContaining({
          userId: "user-a",
          endpoint: validSubscription.endpoint,
          p256dh: "BPublicKey",
          auth: "AuthSecret",
        }),
        update: expect.objectContaining({
          userId: "user-a",
          p256dh: "BPublicKey",
          auth: "AuthSecret",
        }),
      }),
    )
  })

  it("trả lỗi generic khi DB throw", async () => {
    mockWithSession("user-a")
    prisma.pushSubscription.upsert.mockRejectedValue(new Error("db down"))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await subscribePush(validSubscription)

    expect(result.success).toBe(false)
    expect(result.code).toBeUndefined()
    errorSpy.mockRestore()
  })
})

describe("unsubscribePush", () => {
  it("trả UNAUTHORIZED khi chưa login", async () => {
    mockNoSession()
    const result = await unsubscribePush("https://example.com/push")
    expect(result.success).toBe(false)
    expect(result.code).toBe("UNAUTHORIZED")
  })

  it("trả VALIDATION_ERROR khi endpoint rỗng", async () => {
    mockWithSession("user-a")
    const result = await unsubscribePush("   ")
    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
  })

  it("xóa đúng subscription theo endpoint + userId", async () => {
    mockWithSession("user-a")
    prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 })

    const result = await unsubscribePush("https://example.com/push  ")

    expect(result.success).toBe(true)
    expect(result.data?.removed).toBe(1)
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: "https://example.com/push", userId: "user-a" },
    })
  })
})

describe("getMyPushStatus", () => {
  it("trả hasSubscription=false khi chưa login (không UNAUTHORIZED)", async () => {
    mockNoSession()
    const result = await getMyPushStatus()
    expect(result.success).toBe(true)
    expect(result.data?.hasSubscription).toBe(false)
    expect(prisma.pushSubscription.count).not.toHaveBeenCalled()
  })

  it("trả true khi count > 0", async () => {
    mockWithSession("user-a")
    prisma.pushSubscription.count.mockResolvedValue(2)
    const result = await getMyPushStatus()
    expect(result.success).toBe(true)
    expect(result.data?.hasSubscription).toBe(true)
  })

  it("trả false khi count = 0", async () => {
    mockWithSession("user-a")
    prisma.pushSubscription.count.mockResolvedValue(0)
    const result = await getMyPushStatus()
    expect(result.success).toBe(true)
    expect(result.data?.hasSubscription).toBe(false)
  })
})
