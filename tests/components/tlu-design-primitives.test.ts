import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("TLU design primitive contracts", () => {
  it("defines brand identity and semantic status tokens independently", () => {
    const globals = source("src/app/globals.css")

    expect(globals).toContain("--brand-indigo: #000066;")
    expect(globals).toContain("--brand-scarlet: #f32409;")
    expect(globals).toContain("--official:")
    expect(globals).toContain("--official-soft:")
    expect(globals).toContain("--official-foreground: #ffe4df;")
    expect(globals).toContain("--destructive:")
    expect(globals).toContain("--color-official: var(--official);")
  })

  it("exposes official badge styling separately from destructive styling", () => {
    const badge = source("src/components/ui/badge.tsx")
    const statusBadge = source("src/components/shared/status-badge.tsx")

    expect(badge).toContain(
      'official: "bg-official-soft text-official-foreground border-official/20',
    )
    expect(badge).toContain(
      'destructive:\n          "bg-destructive/10 text-destructive',
    )
    expect(statusBadge).toContain(
      'official: "bg-official-soft text-official-foreground border-official/20"',
    )
    expect(statusBadge).toContain(
      'critical: "bg-destructive/10 text-destructive border-destructive/20"',
    )
    expect(statusBadge).toContain(
      'accent: "bg-official-soft text-official-foreground border-official/20"',
    )
  })

  it("keeps official markers as scarlet identity marks, not soft callout panels", () => {
    const globals = source("src/app/globals.css")

    expect(globals).toContain(".official-marker")
    expect(globals).toContain("background-color: var(--brand-scarlet);")
    expect(globals).not.toContain("background-color: var(--official-soft);")
  })

  it("uses semantic status token classes rather than palette color utilities", () => {
    const badge = source("src/components/ui/badge.tsx")
    const statusBadge = source("src/components/shared/status-badge.tsx")

    expect(badge).toContain("success:")
    expect(badge).toContain("warning:")
    expect(badge).toContain("info:")
    expect(statusBadge).toContain(
      'success: "bg-success-soft text-success border-success/20"',
    )
    expect(statusBadge).toContain(
      'warning: "bg-warning-soft text-warning border-warning/20"',
    )
    expect(statusBadge).toContain(
      'info: "bg-info-soft text-info border-info/20"',
    )
    expect(statusBadge).not.toMatch(/(?:orange|green|blue)-(?:50|200|600)/)
  })
})
