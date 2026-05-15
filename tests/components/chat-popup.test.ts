// @vitest-environment jsdom

import { readFileSync } from "fs"
import path from "path"
import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatConversationBubble, ChatMessageItem } from "@/types/chat"
import { ChatPopup } from "@/components/layout/chat-popup"

const getChatSessionUser = vi.hoisted(() => vi.fn())
const getConversationMessages = vi.hoisted(() => vi.fn())
const markConversationAsRead = vi.hoisted(() => vi.fn())
const openDirectConversation = vi.hoisted(() => vi.fn())
const sendConversationMessage = vi.hoisted(() => vi.fn())
const notifyContactGroupChanged = vi.hoisted(() => vi.fn())
const notifyContactMessageChanged = vi.hoisted(() => vi.fn())

vi.mock("@/actions/chat", () => ({
  getChatSessionUser,
  getConversationMessages,
  markConversationAsRead,
  openDirectConversation,
  sendConversationMessage,
}))

vi.mock("@/lib/contacts/events", () => ({
  notifyContactGroupChanged,
  notifyContactMessageChanged,
}))

vi.mock("@/hooks/use-chat-realtime", () => ({
  useChatRealtime: () => ({
    typingUsers: [],
    onlineUserIds: new Set<string>(),
    publishTyping: vi.fn(),
  }),
}))

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
    measureElement: vi.fn(),
    scrollToIndex: vi.fn(),
  }),
}))

vi.mock("@/components/messages/chat-header", () => ({
  ChatHeader: ({
    name,
    avatarSrc,
    isGroup,
    participantCount,
  }: {
    name: string
    avatarSrc?: string
    isGroup?: boolean
    participantCount?: number
  }) =>
    createElement("div", {
      "data-testid": "chat-header",
      "data-name": name,
      "data-avatar": avatarSrc ?? "",
      "data-group": String(Boolean(isGroup)),
      "data-participant-count": String(participantCount ?? 0),
    }),
}))

vi.mock("@/components/messages/message-input", () => ({
  MessageInput: ({
    disabled,
    onSend,
  }: {
    disabled?: boolean
    onSend?: (payload: { message: string }) => Promise<boolean>
  }) =>
    createElement(
      "button",
      {
        type: "button",
        "data-testid": "composer",
        disabled,
        onClick: () => {
          void onSend?.({ message: "Xin chao" })
        },
      },
      "send",
    ),
}))

const CHAT_POPUP_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/layout/chat-popup.tsx"),
  "utf8",
)

const directConversation: ChatConversationBubble = {
  id: "direct-1",
  name: "Lan",
  avatarUrl: "/lan.png",
  isGroup: false,
  peerUserId: "user-lan",
  participantCount: 2,
  communityType: null,
}

const groupConversation: ChatConversationBubble = {
  id: "group-1",
  name: "Python Group",
  avatarUrl: null,
  isGroup: true,
  peerUserId: null,
  participantCount: 12,
  communityType: "GROUP",
}

const sentMessage: ChatMessageItem = {
  id: "message-1",
  conversationId: "group-1",
  content: "Xin chao",
  senderId: "user-self",
  senderName: "Ban",
  senderAvatarUrl: null,
  createdAt: "2026-05-15T09:00:00.000Z",
  isOwn: true,
  attachment: null,
}

function renderPopup(conversation: ChatConversationBubble) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(
      createElement(ChatPopup, {
        conversation,
        index: 0,
        onClose: vi.fn(),
        onFocus: vi.fn(),
      }),
    )
  })

  return { container, root }
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("ChatPopup", () => {
  let roots: Root[]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    roots = []
    getChatSessionUser.mockResolvedValue({
      success: true,
      data: {
        userId: "user-self",
        displayName: "Ban",
        avatarUrl: null,
      },
    })
    getConversationMessages.mockResolvedValue({
      success: true,
      data: {
        items: [],
        nextCursor: null,
        hasMore: false,
      },
    })
    sendConversationMessage.mockResolvedValue({
      success: true,
      data: sentMessage,
    })
  })

  afterEach(async () => {
    for (const root of roots) {
      await act(async () => {
        root.unmount()
      })
    }
    document.body.innerHTML = ""
  })

  it("loads a direct conversation by id without opening a new direct conversation", async () => {
    const { root } = renderPopup(directConversation)
    roots.push(root)

    await flushEffects()

    expect(getConversationMessages).toHaveBeenCalledWith({
      conversationId: "direct-1",
    })
    expect(openDirectConversation).not.toHaveBeenCalled()
  })

  it("notifies group contact changes after a group send", async () => {
    const { container, root } = renderPopup(groupConversation)
    roots.push(root)
    await flushEffects()

    await act(async () => {
      ;(container.querySelector('[data-testid="composer"]') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(notifyContactGroupChanged).toHaveBeenCalledWith({
      action: "message-sent",
      conversationId: "group-1",
    })
    expect(notifyContactMessageChanged).not.toHaveBeenCalled()
  })

  it("notifies direct contact changes after a direct send", async () => {
    const { container, root } = renderPopup(directConversation)
    roots.push(root)
    await flushEffects()

    await act(async () => {
      ;(container.querySelector('[data-testid="composer"]') as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(notifyContactMessageChanged).toHaveBeenCalledWith({
      userId: "user-lan",
      conversationId: "direct-1",
      direction: "sent",
    })
    expect(notifyContactGroupChanged).not.toHaveBeenCalled()
  })

  it("shows an error and disables the composer when initial messages cannot load", async () => {
    getConversationMessages.mockResolvedValue({
      success: false,
      error: "FORBIDDEN",
    })
    const { container, root } = renderPopup(groupConversation)
    roots.push(root)

    await flushEffects()

    expect(container.textContent).toContain("Không thể tải hội thoại.")
    expect(container.querySelector('[data-testid="composer"]')).toHaveProperty("disabled", true)
  })
})

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
