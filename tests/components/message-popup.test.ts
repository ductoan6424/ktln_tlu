// @vitest-environment jsdom

import { readFileSync } from "fs"
import path from "path"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatConversationItem } from "@/types/chat"

const listMyConversations = vi.hoisted(() => vi.fn())
const markConversationAsRead = vi.hoisted(() => vi.fn())

vi.mock("@/actions/chat", () => ({
  listMyConversations,
  markConversationAsRead,
}))

vi.mock("@/components/ui/dropdown-menu", async () => {
  const React = await import("react")
  const MenuContext = React.createContext<{
    open: boolean
    setOpen: (open: boolean) => void
  } | null>(null)

  return {
    DropdownMenu: ({
      children,
      open,
      onOpenChange,
    }: {
      children: React.ReactNode
      open: boolean
      onOpenChange: (open: boolean) => void
    }) =>
      React.createElement(
        MenuContext.Provider,
        { value: { open, setOpen: onOpenChange } },
        children,
      ),
    DropdownMenuTrigger: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
      const menu = React.useContext(MenuContext)

      return React.createElement(
        "button",
        {
          type: "button",
          ...props,
          onClick: () => menu?.setOpen(!menu.open),
        },
        children,
      )
    },
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => {
      const menu = React.useContext(MenuContext)
      return menu?.open ? React.createElement("div", null, children) : null
    },
    DropdownMenuSeparator: () => React.createElement("hr"),
  }
})

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    createElement("div", null, children),
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
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("renders every conversation and reports the selected group row", async () => {
    listMyConversations.mockResolvedValue({
      success: true,
      data: [directConversation, groupConversation],
    })
    const onOpenConversation = vi.fn()
    const { MessagePopup } = await import("@/components/layout/message-popup")
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(createElement(MessagePopup, { onOpenConversation }))
    })

    const trigger = container.querySelector('[aria-label="Tin nhắn"]')
    expect(trigger).not.toBeNull()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
    })

    expect(container.textContent).toContain("Lan")
    expect(container.textContent).toContain("Python Group")

    const groupRow = [...container.querySelectorAll("button")].find((element) =>
      element.textContent?.includes("Python Group"),
    )
    expect(groupRow).not.toBeUndefined()

    await act(async () => {
      groupRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(onOpenConversation).toHaveBeenCalledWith({
      id: "group-1",
      name: "Python Group",
      avatarUrl: null,
      isGroup: true,
      peerUserId: null,
      participantCount: 12,
      communityType: "GROUP",
    })

    await act(async () => {
      root.unmount()
    })
  })

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
