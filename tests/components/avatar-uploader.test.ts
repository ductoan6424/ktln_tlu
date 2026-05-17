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
  deriveAvatarSelectionState,
  validateAvatarFile,
} from "@/components/profile/avatar-uploader"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("avatar uploader helpers", () => {
  it("rejects invalid file types and oversized files", () => {
    const wrongType = new File(["avatar"], "avatar.txt", { type: "text/plain" })
    const oversized = new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "avatar.png", {
      type: ALLOWED_IMAGE_TYPES[0],
    })

    expect(validateAvatarFile(wrongType)).toBe("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.")
    expect(validateAvatarFile(oversized)).toBe("Ảnh vượt quá dung lượng tối đa 5MB.")
    expect(validateAvatarFile(new File(["avatar"], "avatar.png", { type: "image/png" }))).toBeNull()
  })

  it("clears stale selection when an invalid replacement is chosen", () => {
    const previousFile = new File(["avatar"], "avatar.png", {
      type: ALLOWED_IMAGE_TYPES[0],
    })
    const invalidReplacement = new File(["avatar"], "avatar.svg", {
      type: "image/svg+xml",
    })

    const nextState = deriveAvatarSelectionState(
      {
        selectedFile: previousFile,
        previewUrl: "blob:previous-preview",
      },
      invalidReplacement,
      () => "blob:new-preview"
    )

    expect(nextState).toEqual({
      selectedFile: null,
      previewUrl: null,
      error: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.",
    })
  })
})

describe("AvatarUploader", () => {
  it("renders the hidden file input and the initial settings state", () => {
    const markup = renderToStaticMarkup(
      createElement(AvatarUploader, {
        currentAvatarUrl: "https://cdn.example/avatar.png",
        displayName: "Nguyen Van A",
        variant: "settings",
      })
    )

    expect(markup).toContain('type="file"')
    expect(markup).toContain('accept="image/jpeg,image/png,image/webp,image/gif"')
    expect(markup).toContain("Chọn ảnh")
    expect(markup).not.toContain("Lưu ảnh")
    expect(markup).not.toContain("Hủy")
  })
})
