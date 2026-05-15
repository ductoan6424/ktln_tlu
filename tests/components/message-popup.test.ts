import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it, vi } from "vitest"
import type { ChatConversationItem } from "@/types/chat"

vi.mock("@/actions/chat", () => ({
  listMyConversations: vi.fn(),
  markConversationAsRead: vi.fn(),
}))

const MESSAGE_POPUP_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/layout/message-popup.tsx"),
  "utf8",
)

const directConversation: ChatConversationItem = {
  id: "direct-1",
  name: "Lan",
  peerUserId: "user-lan",
  avatarUrl: null,
  isGroup: false,
  communityType: null,
  isOnline: false,
  participantCount: 2,
  unreadCount: 0,
  lastMessage: "Xin chao",
  lastMessageAt: "1 phut truoc",
}

const groupConversation: ChatConversationItem = {
  id: "group-1",
  name: "Python Group",
  peerUserId: null,
  avatarUrl: null,
  isGroup: true,
  communityType: "GROUP",
  isOnline: false,
  participantCount: 12,
  unreadCount: 2,
  lastMessage: "Thong bao moi",
  lastMessageAt: "vua xong",
}

describe("MessagePopup", () => {
  it("keeps direct and group/community conversations from the list source", () => {
    expect(MESSAGE_POPUP_SOURCE).toContain("setConversations(result.data)")
    expect(MESSAGE_POPUP_SOURCE).not.toContain(
      ".filter((conversation) => Boolean(conversation.peerUserId))",
    )
    expect(MESSAGE_POPUP_SOURCE).toContain("conversations.map((conversation) =>")
    expect(MESSAGE_POPUP_SOURCE).toContain("isGroup={conversation.isGroup}")
  })

  it("reports the selected group conversation even without a peer user id", async () => {
    const { toMessagePopupConversation } = await import(
      "@/components/layout/message-popup"
    )

    expect(toMessagePopupConversation(groupConversation)).toEqual({
      id: "group-1",
      name: "Python Group",
      avatarUrl: null,
      isGroup: true,
      peerUserId: null,
      participantCount: 12,
      communityType: "GROUP",
    })
  })

  it("preserves the bubble shape for direct conversations too", async () => {
    const { toMessagePopupConversation } = await import(
      "@/components/layout/message-popup"
    )

    expect(toMessagePopupConversation(directConversation)).toEqual({
      id: "direct-1",
      name: "Lan",
      avatarUrl: null,
      isGroup: false,
      peerUserId: "user-lan",
      participantCount: 2,
      communityType: null,
    })
  })
})
