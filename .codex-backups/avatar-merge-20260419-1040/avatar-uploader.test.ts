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
  it("accepts allowed image files within the size limit", () => {
    const file = new File(["avatar"], "avatar.png", { type: ALLOWED_IMAGE_TYPES[1] })

    expect(validateAvatarFile(file)).toBeNull()
  })

  it("rejects unsupported image files", () => {
    const file = new File(["avatar"], "avatar.svg", { type: "image/svg+xml" })

    expect(validateAvatarFile(file)).toBe(
      "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF."
    )
  })

  it("rejects image files larger than the limit", () => {
    const file = new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "avatar.png", {
      type: ALLOWED_IMAGE_TYPES[0],
    })

    expect(validateAvatarFile(file)).toBe("Ảnh vượt quá dung lượng tối đa 5MB.")
  })
})

describe("AvatarUploader", () => {
  it("renders idle controls without save or cancel actions before a file is selected", () => {
    const markup = renderToStaticMarkup(
      createElement(AvatarUploader, {
        variant: "settings",
        currentAvatarUrl: "https://cdn.example/avatar.png",
        displayName: "Nguyen Van A",
      })
    )

    expect(markup).toContain("Nguyen Van A")
    expect(markup).toContain("Chọn ảnh")
    expect(markup).not.toContain("Lưu ảnh")
    expect(markup).not.toContain("Hủy")
  })
})
