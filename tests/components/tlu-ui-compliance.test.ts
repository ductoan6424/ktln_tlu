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

  it("stabilizes the header notification popup layout", () => {
    const notificationPopup = source("src/components/layout/notification-popup.tsx")

    expect(notificationPopup).toContain("<DropdownMenu modal={false} open={isOpen}")
    expect(notificationPopup).toContain("w-[min(380px,calc(100vw-1rem))]")
    expect(notificationPopup).toContain("max-h-[min(520px,calc(100vh-5rem))]")
    expect(notificationPopup).toContain("overflow-hidden")
    expect(notificationPopup).toContain("overflow-y-auto overscroll-contain")
  })

  it("stabilizes the header message popup layout", () => {
    const messagePopup = source("src/components/layout/message-popup.tsx")

    expect(messagePopup).toMatch(/<DropdownMenu\s+modal=\{false\}/)
    expect(messagePopup).toContain("w-[min(380px,calc(100vw-1rem))]")
    expect(messagePopup).toContain("max-h-[min(520px,calc(100vh-5rem))]")
    expect(messagePopup).toContain("overflow-hidden")
    expect(messagePopup).toContain("overflow-y-auto overscroll-contain")
    expect(messagePopup).not.toContain('ScrollArea className="max-h-[400px]"')
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

  it("uses the restrained branded management header and summarized member panel", () => {
    const shell = source("src/components/communities/manage/community-manage-shell.tsx")
    const members = source("src/components/communities/manage/community-members-panel.tsx")
    const course = source("src/app/(main)/courses/[courseId]/manage/page.tsx")

    expect(shell).toContain("brand-panel")
    expect(shell).toContain("bg-brand-scarlet")
    expect(shell).not.toContain("from-brand-indigo via-primary to-brand-scarlet")
    expect(members).toContain("CardAction")
    expect(members).toContain("countLabel")
    expect(course).toContain('countLabel="sinh viên"')
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
