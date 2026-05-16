import { readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const MAIN_LAYOUT_SOURCE = readFileSync(
  path.join(process.cwd(), "src/app/(main)/layout.tsx"),
  "utf8",
)

describe("MainLayout chat dock wiring", () => {
  it("mounts one shared dock around the main layout shell", () => {
    expect(MAIN_LAYOUT_SOURCE).toContain(
      'import { ChatDock } from "@/components/layout/chat-dock"',
    )
    expect(MAIN_LAYOUT_SOURCE.match(/<ChatDock\b/g)).toHaveLength(1)
    expect(MAIN_LAYOUT_SOURCE).toContain("<ChatDock userId={authUser?.id ?? null}>")
    expect(MAIN_LAYOUT_SOURCE).toContain("</ChatDock>")
  })
})
