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

  it("applies user appearance settings as layout data attributes", () => {
    expect(MAIN_LAYOUT_SOURCE).toContain('from "@/lib/settings/user-settings"')
    expect(MAIN_LAYOUT_SOURCE).toContain("getUserSettings(authUser.id)")
    expect(MAIN_LAYOUT_SOURCE).toContain("DEFAULT_USER_SETTINGS")
    expect(MAIN_LAYOUT_SOURCE).toContain('data-theme-preference={appearanceSettings.theme.toLowerCase()}')
    expect(MAIN_LAYOUT_SOURCE).toContain('data-density={appearanceSettings.compactMode ? "compact" : "comfortable"}')
    expect(MAIN_LAYOUT_SOURCE).toContain('data-reduced-motion={appearanceSettings.reducedMotion ? "true" : "false"}')
  })
})
