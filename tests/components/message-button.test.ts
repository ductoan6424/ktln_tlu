import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const push = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())
const openDirectConversation = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast, toasts: [] }),
}))

vi.mock("@/actions/chat", () => ({
  openDirectConversation,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("MessageButton", () => {
  it("hiển thị nhãn 'Nhắn tin' với icon ở variant text mặc định", async () => {
    const { MessageButton } = await import("@/components/messages/message-button")

    const html = renderToStaticMarkup(
      createElement(MessageButton, { targetUserId: "user-b" })
    )

    expect(html).toContain("Nhắn tin")
  })

  it("variant icon chỉ render icon + aria-label, không có text 'Nhắn tin'", async () => {
    const { MessageButton } = await import("@/components/messages/message-button")

    const html = renderToStaticMarkup(
      createElement(MessageButton, {
        targetUserId: "user-b",
        variant: "icon",
      })
    )

    expect(html).toContain('aria-label="Nhắn tin"')
    expect(html).not.toContain(">Nhắn tin<")
  })

  it("apply className tuỳ chỉnh từ prop", async () => {
    const { MessageButton } = await import("@/components/messages/message-button")

    const html = renderToStaticMarkup(
      createElement(MessageButton, {
        targetUserId: "user-b",
        className: "test-custom-class",
      })
    )

    expect(html).toContain("test-custom-class")
  })
})
