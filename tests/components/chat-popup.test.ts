import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const CHAT_POPUP_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/layout/chat-popup.tsx"),
  "utf8",
)

describe("ChatPopup conversation contract", () => {
  it("loads the selected conversation directly instead of opening a new direct conversation", () => {
    expect(CHAT_POPUP_SOURCE).toContain("conversation: ChatConversationBubble")
    expect(CHAT_POPUP_SOURCE).not.toContain("openDirectConversation")
    expect(CHAT_POPUP_SOURCE).toContain("conversationId: conversation.id")
    expect(CHAT_POPUP_SOURCE).toContain("setConversationId(conversation.id)")
  })

  it("wires group metadata into the floating header", () => {
    expect(CHAT_POPUP_SOURCE).toContain("name={conversation.name}")
    expect(CHAT_POPUP_SOURCE).toContain("avatarSrc={conversation.avatarUrl ?? undefined}")
    expect(CHAT_POPUP_SOURCE).toContain("isGroup={conversation.isGroup}")
    expect(CHAT_POPUP_SOURCE).toContain("participantCount={conversation.participantCount}")
  })

  it("derives online state only from a direct peer user id", () => {
    expect(CHAT_POPUP_SOURCE).toContain(
      "Boolean(conversation.peerUserId && onlineUserIds.has(conversation.peerUserId))",
    )
  })

  it("uses direct and group-specific contact notifications after sending", () => {
    expect(CHAT_POPUP_SOURCE).toContain("if (conversation.peerUserId)")
    expect(CHAT_POPUP_SOURCE).toContain("userId: conversation.peerUserId")
    expect(CHAT_POPUP_SOURCE).toContain("notifyContactGroupChanged({")
    expect(CHAT_POPUP_SOURCE).toContain('action: "message-sent"')
  })
})
