import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

function combinedSource(paths: string[]) {
  return paths.map(source).join("\n")
}

function directorySource(path: string) {
  return readdirSync(resolve(process.cwd(), path), { recursive: true })
    .filter((entry) => /\.(?:ts|tsx)$/.test(String(entry)))
    .map((entry) => source(`${path}/${String(entry).replaceAll("\\", "/")}`))
    .join("\n")
}

describe("TLU full UI compliance contracts", () => {
  it("keeps standard actions rectangular and reserves circles for icon controls", () => {
    const button = source("src/components/ui/button-variants.ts")

    expect(button).toContain("justify-center rounded-lg border")
    expect(button).toContain("size-6 rounded-full")
    expect(button).toContain("size-7 rounded-full")
    expect(button).not.toContain("h-6 gap-1 rounded-full px-2 text-xs")
    expect(button).not.toContain("h-7 gap-1 rounded-full px-2.5")
  })

  it("uses identity and semantic colors for unread and presence state", () => {
    const unread = combinedSource([
      "src/components/layout/notification-popup.tsx",
      "src/components/layout/message-popup.tsx",
    ])
    const avatar = source("src/components/shared/user-avatar.tsx")

    expect(unread).toContain("bg-official text-white")
    expect(unread).not.toContain("bg-destructive text-white")
    expect(avatar).toContain('online: "bg-success"')
    expect(avatar).toContain('offline: "bg-muted-foreground"')
    expect(avatar).toContain('away: "bg-warning"')
  })

  it("removes the legacy social palette from community management", () => {
    const management = directorySource("src/components/communities/manage")

    expect(management).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(management).toContain("bg-primary")
    expect(management).toContain("bg-card")
    expect(management).toContain("border-border")
  })

  it("removes the legacy social palette from course management", () => {
    const courses = directorySource("src/app/(main)/courses/[courseId]/manage")

    expect(courses).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(courses).toContain("text-foreground")
    expect(courses).toContain("border-border")
  })

  it("uses primary conversation styling and semantic notification callouts", () => {
    const bubble = source("src/components/messages/chat-bubble.tsx")
    const header = source("src/components/messages/chat-header.tsx")
    const input = source("src/components/messages/message-input.tsx")
    const alert = source("src/components/notifications/priority-alert.tsx")

    expect(bubble).toContain("bg-primary text-primary-foreground")
    expect(bubble).not.toContain("bg-brand-indigo text-white")
    expect(header).toContain("bg-success")
    expect(input).toContain("text-primary")
    expect(alert).not.toMatch(/bg-(?:blue|orange)-50/)
  })

  it("applies documented feed geometry", () => {
    const post = source("src/components/feed/post-card.tsx")
    const composer = source("src/components/feed/post-composer.tsx")

    expect(post).toContain("relative overflow-hidden rounded-lg border-border/70")
    expect(post).toContain('<Card className="rounded-lg border-border/70')
    expect(composer).toContain('"rounded-xl border-border/70')
    expect(composer).toContain('<Card className="rounded-xl border-border/70')
  })

  it("renders signature TLU event accents instead of a neutral date block", () => {
    const events = source("src/app/(main)/events/events-page-client.tsx")

    expect(events).toContain("bg-brand-indigo text-white")
    expect(events).toContain("bg-brand-scarlet")
    expect(events).not.toContain("rounded-lg bg-muted")
  })

  it("maps admin metrics and tables onto semantic surfaces", () => {
    const admin = combinedSource([
      "src/app/admin/dashboard/page.tsx",
      "src/app/admin/analytics/admin-analytics-client.tsx",
    ])
    const table = source("src/components/admin/module/admin-data-table.tsx")

    expect(admin).not.toMatch(/(?:text|bg)-(?:blue|green|orange|purple)-(?:50|600)/)
    expect(table).toContain("<thead className=\"bg-muted/50\">")
  })

  it("keeps profile elevation and radius restrained", () => {
    const profile = combinedSource([
      "src/components/profile/profile-header.tsx",
      "src/components/profile/avatar-uploader.tsx",
    ])

    expect(profile).not.toContain("shadow-lg")
    expect(profile).not.toContain("rounded-2xl border border-border bg-card p-4 shadow-sm")
    expect(profile).toContain("rounded-xl border border-border bg-card p-4 shadow-sm")
  })

  it("keeps default cards and feed supporting cards within the standard radius tier", () => {
    const card = source("src/components/ui/card.tsx")
    const feed = source("src/app/(main)/feed/feed-page-client.tsx")

    expect(card).toContain("overflow-hidden rounded-lg border border-border/70")
    expect(card).not.toContain("overflow-hidden rounded-2xl border border-border/70")
    expect(feed).not.toContain("rounded-2xl border-border/70 shadow-sm")
  })

  it("uses semantic tokens on residual club, dashboard, notification and device states", () => {
    const residual = combinedSource([
      "src/components/clubs/manage/member-manage-list.tsx",
      "src/components/clubs/manage/event-manage-list.tsx",
      "src/components/dashboard/academic-update-card.tsx",
      "src/components/layout/mock-data.ts",
      "src/components/pwa/push-devices-manager.tsx",
      "src/components/admin/pro-tip-card.tsx",
    ])

    expect(residual).not.toMatch(
      /(?:bg|text|border)-(?:red|blue|green|orange|purple|pink|gray|yellow|emerald)-(?:50|100|200|400|500|700)/,
    )
  })
})
