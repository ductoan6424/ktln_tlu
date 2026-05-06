import { readFileSync } from "fs"
import path from "path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

const GROUP_CHAT_SOURCE_FILES = [
  "src/components/messages/create-group-dialog.tsx",
  "src/components/messages/group-info-dialog.tsx",
]

describe("group chat button components", () => {
  it("uses the shared Button component instead of native button tags in group chat dialogs", () => {
    for (const filePath of GROUP_CHAT_SOURCE_FILES) {
      const source = readFileSync(path.join(process.cwd(), filePath), "utf8")

      expect(source, filePath).not.toContain("<button")
      expect(source, filePath).toContain("<Button")
    }
  })

  it("renders conversation rows through the shared Button component", async () => {
    const { ConversationItem } = await import("@/components/messages/conversation-item")

    const html = renderToStaticMarkup(
      createElement(ConversationItem, {
        name: "Nhom chat",
        lastMessage: "Tin nhan moi",
        time: "10:00",
        onClick: () => undefined,
      })
    )

    expect(html).toContain('data-slot="button"')
    expect(html).toContain("<button")
  })
})
