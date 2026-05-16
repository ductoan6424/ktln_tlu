import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const FEED_PAGE_SOURCE = readFileSync(
  path.join(process.cwd(), "src/app/(main)/feed/feed-page-client.tsx"),
  "utf8",
)

describe("FeedPageClient chat dock migration", () => {
  it("delegates floating chat ownership to the global dock", () => {
    expect(FEED_PAGE_SOURCE).not.toContain(
      'import { ChatPopup } from "@/components/layout/chat-popup"',
    )
    expect(FEED_PAGE_SOURCE).not.toContain("openPopups")
    expect(FEED_PAGE_SOURCE).not.toContain("closeChat")
    expect(FEED_PAGE_SOURCE).not.toContain("focusChat")
    expect(FEED_PAGE_SOURCE).not.toContain("setupIncomingListeners")
    expect(FEED_PAGE_SOURCE).not.toContain("listMyConversations")
    expect(FEED_PAGE_SOURCE).not.toContain("createAblyClient")
    expect(FEED_PAGE_SOURCE).not.toContain("getChatChannelName")
    expect(FEED_PAGE_SOURCE).not.toContain("ChatMessageItem")
    expect(FEED_PAGE_SOURCE).toContain(
      'import { useChatDock } from "@/components/layout/chat-dock"',
    )
    expect(FEED_PAGE_SOURCE).toContain("openDirectConversation")
    expect(FEED_PAGE_SOURCE).toContain("const { openConversation } = useChatDock()")
  })
})
