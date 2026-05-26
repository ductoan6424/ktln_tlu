import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8")

describe("TLU messages visual contracts", () => {
  it("frames the messages route as a rounded workspace surface", () => {
    const page = source("src/app/(main)/messages/page.tsx")

    expect(page).toContain("bg-background p-3")
    expect(page).toContain("rounded-[1.25rem] border border-border/70 bg-card shadow-sm")
    expect(page).not.toContain("bg-card relative")
  })

  it("uses TLU semantic styling for conversations and chat bubbles", () => {
    const conversationList = source("src/components/messages/conversation-list.tsx")
    const conversationItem = source("src/components/messages/conversation-item.tsx")
    const chatBubble = source("src/components/messages/chat-bubble.tsx")

    expect(conversationList).toContain("Tin nhắn nội bộ")
    expect(conversationList).toContain("rounded-[1.25rem] border border-border/70 bg-card shadow-sm")
    expect(conversationItem).toContain("border-l-4 border-brand-indigo bg-primary/10")
    expect(conversationItem).toContain("bg-brand-scarlet text-white")
    expect(chatBubble).toContain("bg-brand-indigo text-white")
    expect(chatBubble).toContain("border border-border/70 bg-card")
    expect(chatBubble).not.toContain("rounded-tr-none shadow-md shadow-primary/10")
  })

  it("keeps the chat composer in the shared card and focus hierarchy", () => {
    const messageInput = source("src/components/messages/message-input.tsx")
    const chatHeader = source("src/components/messages/chat-header.tsx")

    expect(chatHeader).toContain("border-border/70 bg-card/95")
    expect(messageInput).toContain("border-t border-border/70 bg-card")
    expect(messageInput).toContain("rounded-[1.25rem] border border-border/70 bg-background")
    expect(messageInput).toContain("text-brand-indigo hover:bg-primary/10")
  })
})
