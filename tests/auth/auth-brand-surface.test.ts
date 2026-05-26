import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8")

describe("branded authentication surfaces", () => {
  it("renders a two-region TLU identity layout with compact mobile support", () => {
    const layout = source("src/components/layout/auth-layout.tsx")

    expect(layout).toContain("brand-panel")
    expect(layout).toContain("tlu-geometry")
    expect(layout).toContain("Cộng đồng Đại học Thăng Long")
    expect(layout).toContain("lg:grid-cols")
    expect(layout).toContain("lg:hidden")
  })

  it("uses semantic auth feedback rather than raw palette helpers", () => {
    const files = [
      "src/components/auth/register-card.tsx",
      "src/components/auth/forgot-password-card.tsx",
      "src/components/auth/auth-status-card.tsx",
      "src/app/(auth)/reset-password/page.tsx",
    ].map(source).join("\n")

    expect(files).toContain("bg-success-soft")
    expect(files).toContain("text-success")
    expect(files).toContain("bg-warning")
    expect(files).not.toMatch(/bg-(?:emerald|yellow)-/)
    expect(files).not.toMatch(/text-emerald-/)
  })

  it("normalizes auth cards to the shared surface hierarchy", () => {
    const files = [
      "src/components/auth/login-card.tsx",
      "src/components/auth/login-form.tsx",
      "src/components/auth/register-card.tsx",
      "src/components/auth/forgot-password-card.tsx",
      "src/components/auth/auth-status-card.tsx",
      "src/app/(auth)/complete-contact-email/complete-contact-email-card.tsx",
    ].map(source).join("\n")

    expect(files).toContain("border-border/70")
    expect(files).toContain("shadow-sm")
    expect(files).not.toContain("shadow-2xl")
    expect(files).not.toContain("shadow-foreground/5")
  })
})
