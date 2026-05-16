// @vitest-environment jsdom

import { act, createElement, type ComponentType, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ChatDock, useChatDock } from "@/components/layout/chat-dock"
import type { ChatConversationBubble, ChatInboxNotification } from "@/types/chat"

const useInboxNotification = vi.hoisted(() => vi.fn())
const usePathname = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/use-inbox-notification", () => ({
  useInboxNotification,
}))

vi.mock("next/navigation", () => ({
  usePathname,
}))

vi.mock("@/components/layout/chat-popup", () => ({
  ChatPopup: ({
    conversation,
    index,
    onClose,
    onFocus,
  }: {
    conversation: ChatConversationBubble
    index: number
    onClose: () => void
    onFocus: () => void
  }) =>
    createElement(
      "button",
      {
        type: "button",
        "data-testid": `chat-popup-${conversation.id}`,
        "data-index": String(index),
        "data-avatar": conversation.avatarUrl ?? "",
        "data-group": String(conversation.isGroup),
        "data-peer-user-id": conversation.peerUserId ?? "",
        "data-participant-count": String(conversation.participantCount),
        "data-community-type": conversation.communityType ?? "",
        onClick: onFocus,
        onDoubleClick: onClose,
      },
      conversation.name,
    ),
}))

const conversations: Record<string, ChatConversationBubble> = {
  a: {
    id: "a",
    name: "A",
    avatarUrl: null,
    isGroup: false,
    peerUserId: "user-a",
    participantCount: 2,
    communityType: null,
  },
  b: {
    id: "b",
    name: "B",
    avatarUrl: null,
    isGroup: false,
    peerUserId: "user-b",
    participantCount: 2,
    communityType: null,
  },
  c: {
    id: "c",
    name: "C",
    avatarUrl: null,
    isGroup: true,
    peerUserId: null,
    participantCount: 5,
    communityType: "GROUP",
  },
  d: {
    id: "d",
    name: "D",
    avatarUrl: null,
    isGroup: true,
    peerUserId: null,
    participantCount: 8,
    communityType: "CLUB",
  },
}

const TestChatDock = ChatDock as ComponentType<{
  children?: ReactNode
  userId: string | null
}>

function getRenderedIds(container: HTMLElement) {
  return [...container.querySelectorAll("[data-testid^='chat-popup-']")].map((element) =>
    element.getAttribute("data-testid")?.replace("chat-popup-", ""),
  )
}

function DockHarness({
  children,
}: {
  children?: ReactNode
}) {
  const { openConversation } = useChatDock()

  return createElement(
    "div",
    null,
    Object.entries(conversations).map(([key, conversation]) =>
      createElement(
        "button",
        {
          key,
          type: "button",
          "data-testid": `open-${key}`,
          onClick: () => openConversation(conversation),
        },
        `open ${key}`,
      ),
    ),
    children,
  )
}

async function renderDock() {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      createElement(
        TestChatDock,
        {
          userId: "user-self",
        },
        createElement(DockHarness),
      ),
    )
  })

  return { container, root }
}

async function click(container: HTMLElement, testId: string) {
  await act(async () => {
    ;(container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement).click()
  })
}

describe("ChatDock", () => {
  let roots: Root[]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    usePathname.mockReturnValue("/feed")
    roots = []
  })

  afterEach(async () => {
    for (const root of roots) {
      await act(async () => {
        root.unmount()
      })
    }
    document.body.innerHTML = ""
  })

  it("deduplicates by conversation id and focuses an existing bubble", async () => {
    const { container, root } = await renderDock()
    roots.push(root)

    await click(container, "open-a")
    await click(container, "open-b")
    await click(container, "open-a")

    expect(getRenderedIds(container)).toEqual(["a", "b"])
  })

  it("keeps at most three open conversations", async () => {
    const { container, root } = await renderDock()
    roots.push(root)

    await click(container, "open-a")
    await click(container, "open-b")
    await click(container, "open-c")
    await click(container, "open-d")

    expect(getRenderedIds(container)).toEqual(["d", "c", "b"])
  })

  it("passes its user id into the inbox subscription", async () => {
    const { root } = await renderDock()
    roots.push(root)

    expect(useInboxNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-self",
      }),
    )
  })

  it("opens incoming direct and group notifications as conversation bubbles", async () => {
    const { container, root } = await renderDock()
    roots.push(root)

    const incoming = useInboxNotification.mock.calls.at(-1)?.[0]?.onIncoming as
      | ((notification: ChatInboxNotification) => void)
      | undefined

    expect(incoming).toBeTypeOf("function")

    await act(async () => {
      incoming?.({
        conversationId: "direct-inbox",
        conversationName: null,
        conversationType: "DIRECT",
        peerUserId: "user-lan",
        participantCount: 2,
        communityType: null,
        senderId: "user-lan",
        senderName: "Lan",
        senderAvatarUrl: "/lan.png",
        content: "Xin chao",
      })
      incoming?.({
        conversationId: "group-inbox",
        conversationName: null,
        conversationType: "GROUP",
        peerUserId: null,
        participantCount: 12,
        communityType: "COURSE",
        senderId: "user-minh",
        senderName: "Minh",
        senderAvatarUrl: "/minh.png",
        content: "Thong bao",
      })
    })

    const direct = container.querySelector('[data-testid="chat-popup-direct-inbox"]')
    const group = container.querySelector('[data-testid="chat-popup-group-inbox"]')

    expect(getRenderedIds(container)).toEqual(["group-inbox", "direct-inbox"])
    expect(direct?.textContent).toBe("Lan")
    expect(direct).toHaveProperty("dataset.avatar", "/lan.png")
    expect(direct).toHaveProperty("dataset.group", "false")
    expect(direct).toHaveProperty("dataset.peerUserId", "user-lan")
    expect(direct).toHaveProperty("dataset.participantCount", "2")
    expect(direct).toHaveProperty("dataset.communityType", "")
    expect(group?.textContent).toBe("Nhóm chat")
    expect(group).toHaveProperty("dataset.avatar", "")
    expect(group).toHaveProperty("dataset.group", "true")
    expect(group).toHaveProperty("dataset.peerUserId", "")
    expect(group).toHaveProperty("dataset.participantCount", "12")
    expect(group).toHaveProperty("dataset.communityType", "COURSE")
  })

  it("does not auto-open incoming inbox notifications on the messages route", async () => {
    usePathname.mockReturnValue("/messages")
    const { container, root } = await renderDock()
    roots.push(root)

    const incoming = useInboxNotification.mock.calls.at(-1)?.[0]?.onIncoming as
      | ((notification: ChatInboxNotification) => void)
      | undefined

    await act(async () => {
      incoming?.({
        conversationId: "direct-inbox",
        conversationName: null,
        conversationType: "DIRECT",
        peerUserId: "user-lan",
        participantCount: 2,
        communityType: null,
        senderId: "user-lan",
        senderName: "Lan",
        senderAvatarUrl: "/lan.png",
        content: "Xin chao",
      })
    })

    expect(getRenderedIds(container)).toEqual([])
  })
})
