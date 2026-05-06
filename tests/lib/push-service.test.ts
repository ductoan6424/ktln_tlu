import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  pushSubscription: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
  },
}))

const webpush = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("web-push", () => ({ default: webpush }))

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "PUBLIC"
  process.env.VAPID_PRIVATE_KEY = "PRIVATE"
  process.env.VAPID_SUBJECT = "mailto:test@example.com"
  prisma.pushSubscription.update.mockResolvedValue({})
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

const samplePayload = {
  title: "Hello",
  body: "World",
  url: "/notifications",
  tag: "g1",
}

describe("sendPushToUser", () => {
  it("không gọi web-push khi VAPID chưa cấu hình", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    delete process.env.VAPID_PRIVATE_KEY
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { sendPushToUser } = await import("@/lib/push/service")
    await sendPushToUser("user-1", samplePayload)

    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled()
    expect(webpush.sendNotification).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("không gọi web-push khi user không có subscription", async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([])
    const { sendPushToUser } = await import("@/lib/push/service")

    await sendPushToUser("user-1", samplePayload)

    expect(webpush.sendNotification).not.toHaveBeenCalled()
    expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled()
  })

  it("gửi push tới mọi subscription và serialize payload thành JSON", async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([
      { id: "s1", endpoint: "https://e1", p256dh: "p1", auth: "a1" },
      { id: "s2", endpoint: "https://e2", p256dh: "p2", auth: "a2" },
    ])
    webpush.sendNotification.mockResolvedValue({ statusCode: 201 })

    const { sendPushToUser } = await import("@/lib/push/service")
    await sendPushToUser("user-1", samplePayload)

    expect(webpush.sendNotification).toHaveBeenCalledTimes(2)
    const [firstSub, firstBody] = webpush.sendNotification.mock.calls[0]!
    expect(firstSub).toEqual({
      endpoint: "https://e1",
      keys: { p256dh: "p1", auth: "a1" },
    })
    expect(JSON.parse(firstBody as string)).toEqual(samplePayload)
    expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled()
  })

  it("xóa subscription expired khi gặp 404/410, giữ subscription lỗi khác", async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([
      { id: "s1", endpoint: "https://e1", p256dh: "p1", auth: "a1" },
      { id: "s2", endpoint: "https://e2", p256dh: "p2", auth: "a2" },
      { id: "s3", endpoint: "https://e3", p256dh: "p3", auth: "a3" },
      { id: "s4", endpoint: "https://e4", p256dh: "p4", auth: "a4" },
    ])
    webpush.sendNotification
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }))
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { statusCode: 404 }))
      .mockRejectedValueOnce(Object.assign(new Error("server"), { statusCode: 500 }))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 2 })

    const { sendPushToUser } = await import("@/lib/push/service")
    await sendPushToUser("user-1", samplePayload)

    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["s2", "s3"] } },
    })
    errorSpy.mockRestore()
  })

  it("không throw khi prisma.findMany fail (best-effort)", async () => {
    prisma.pushSubscription.findMany.mockRejectedValue(new Error("db down"))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { sendPushToUser } = await import("@/lib/push/service")
    await expect(sendPushToUser("user-1", samplePayload)).resolves.toBeUndefined()
    expect(webpush.sendNotification).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
