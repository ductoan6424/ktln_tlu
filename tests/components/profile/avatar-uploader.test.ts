import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/utils/constants"

const updateUserAvatar = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => vi.fn())
const refresh = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}))

vi.mock("@/actions/profile", () => ({
  updateUserAvatar,
}))

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast,
    toasts: [],
  }),
}))

import {
  AvatarUploader,
  validateAvatarFile,
} from "@/components/profile/avatar-uploader"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("validateAvatarFile", () => {
  it("returns the invalid-upload message for missing or empty files", () => {
    const emptyFile = new File([], "avatar.png", { type: ALLOWED_IMAGE_TYPES[0] })

    expect(validateAvatarFile(null)).toBe("Ảnh tải lên không hợp lệ.")
    expect(validateAvatarFile(emptyFile)).toBe("Ảnh tải lên không hợp lệ.")
  })

  it("rejects unsupported file types", () => {
    const file = new File(["avatar"], "avatar.svg", { type: "image/svg+xml" })

    expect(validateAvatarFile(file)).toBe("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.")
  })

  it("rejects files larger than 5MB", () => {
    const file = new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "avatar.png", {
      type: ALLOWED_IMAGE_TYPES[0],
    })

    expect(validateAvatarFile(file)).toBe("Ảnh vượt quá dung lượng tối đa 5MB.")
  })

  it("accepts supported image files within the size limit", () => {
    const file = new File(["avatar"], "avatar.png", { type: ALLOWED_IMAGE_TYPES[1] })

    expect(validateAvatarFile(file)).toBeNull()
  })
})

describe("AvatarUploader static render", () => {
  it("renders the settings variant with helper text and without save or cancel actions", () => {
    const markup = renderToStaticMarkup(
      createElement(AvatarUploader, {
        variant: "settings",
        currentAvatarUrl: "https://cdn.example/avatar.png",
        displayName: "Nguyen Van A",
      })
    )

    expect(markup).toContain("Nguyen Van A")
    expect(markup).toContain("Chọn ảnh JPG, PNG, WEBP hoặc GIF với dung lượng tối đa 5MB.")
    expect(markup).not.toContain("Lưu ảnh")
    expect(markup).not.toContain("Hủy")
  })

  it("renders the profile variant with a camera-style trigger marker and without save or cancel actions", () => {
    const markup = renderToStaticMarkup(
      createElement(AvatarUploader, {
        variant: "profile",
        currentAvatarUrl: "https://cdn.example/avatar.png",
        displayName: "Nguyen Van A",
      })
    )

    expect(markup).toContain('data-avatar-trigger="profile"')
    expect(markup).not.toContain("Lưu ảnh")
    expect(markup).not.toContain("Hủy")
  })
})
