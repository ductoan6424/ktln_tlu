import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = resolve(__dirname, "..", "..")
const MANIFEST_PATH = resolve(ROOT, "public", "manifest.webmanifest")

describe("PWA manifest", () => {
  it("file tồn tại", () => {
    expect(existsSync(MANIFEST_PATH)).toBe(true)
  })

  it("là JSON hợp lệ và có các field bắt buộc", () => {
    const raw = readFileSync(MANIFEST_PATH, "utf8")
    const manifest = JSON.parse(raw) as Record<string, unknown>

    expect(manifest.name).toBeTypeOf("string")
    expect(manifest.short_name).toBeTypeOf("string")
    expect(manifest.start_url).toBe("/")
    expect(manifest.scope).toBe("/")
    expect(manifest.display).toBe("standalone")
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(manifest.lang).toBe("vi")
  })

  it("có ít nhất 1 icon 192x192 và 1 icon 512x512", () => {
    const manifest = JSON.parse(
      readFileSync(MANIFEST_PATH, "utf8"),
    ) as { icons: Array<{ sizes: string; src: string; purpose?: string }> }

    expect(Array.isArray(manifest.icons)).toBe(true)
    const sizes = manifest.icons.map((icon) => icon.sizes)
    expect(sizes).toContain("192x192")
    expect(sizes).toContain("512x512")
  })

  it("có ít nhất 1 icon maskable", () => {
    const manifest = JSON.parse(
      readFileSync(MANIFEST_PATH, "utf8"),
    ) as { icons: Array<{ purpose?: string }> }

    const hasMaskable = manifest.icons.some((icon) =>
      (icon.purpose ?? "").split(/\s+/).includes("maskable"),
    )
    expect(hasMaskable).toBe(true)
  })

  it("tất cả file icon được tham chiếu đều tồn tại trên đĩa", () => {
    const manifest = JSON.parse(
      readFileSync(MANIFEST_PATH, "utf8"),
    ) as { icons: Array<{ src: string }> }

    for (const icon of manifest.icons) {
      const iconPath = resolve(ROOT, "public", icon.src.replace(/^\//, ""))
      expect(
        existsSync(iconPath),
        `icon thiếu: ${icon.src} (chạy npm run pwa:icons)`,
      ).toBe(true)
    }
  })
})
