import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/messages/message-input", () => ({
  MessageInput: ({ disabled }: { disabled?: boolean }) =>
    createElement("div", { "data-disabled": String(Boolean(disabled)) }, "message-input"),
}))

vi.mock("@/components/messages/chat-bubble", () => ({
  ChatBubble: ({ message }: { message: string }) =>
    createElement("div", null, message),
}))

vi.mock("@/components/messages/chat-date-divider", () => ({
  ChatDateDivider: ({ date }: { date: Date | string }) =>
    createElement("time", null, String(date)),
}))

vi.mock("@/actions/chat", () => ({
  sendConversationMessage: vi.fn(),
}))

import { CommunityChatPanel } from "@/components/communities/community-chat-panel"

describe("CommunityChatPanel", () => {
  it("renders readonly state and disables composer", () => {
    const markup = renderToStaticMarkup(
      createElement(CommunityChatPanel, {
        conversationId: "conv-1",
        canSend: false,
        readonlyLabel: "Chỉ quản trị viên có thể gửi tin nhắn.",
        messages: [],
      }),
    )

    expect(markup).toContain("Chỉ quản trị viên có thể gửi tin nhắn.")
    expect(markup).toContain('data-disabled="true"')
  })
})
