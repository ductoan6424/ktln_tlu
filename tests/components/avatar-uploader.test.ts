import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MAX_IMAGE_SIZE } from "@/utils/constants"

const refresh = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}))

import {
  AvatarUploader,
  buildAvatarUploadFormData,
  submitAvatarUpload,
  validateAvatarFile,
} from "@/components/profile/avatar-uploader"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("avatar uploader helpers", () => {
  it("rejects invalid file types and oversized files", () => {
    const wrongType = new File(["avatar"], "avatar.txt", { type: "text/plain" })
    const oversized = new File([new Uint8Array(MAX_IMAGE_SIZE + 1)], "avatar.png", {
      type: "image/png",
    })

    expect(validateAvatarFile(wrongType)).toBe("Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF.")
    expect(validateAvatarFile(oversized)).toBe("Ảnh phải nhỏ hơn 5 MB.")
    expect(validateAvatarFile(new File(["avatar"], "avatar.png", { type: "image/png" }))).toBeNull()
  })

  it("builds form data with the avatar field", () => {
    const file = new File(["avatar"], "avatar.png", { type: "image/png" })

    const formData = buildAvatarUploadFormData(file)

    expect(formData.get("avatar")).toBe(file)
  })

  it("submits the file, shows a success toast, and refreshes the router", async () => {
    const file = new File(["avatar"], "avatar.png", { type: "image/png" })
    const updateUserAvatar = vi.fn().mockResolvedValue({
      success: true,
      data: { avatarUrl: "https://cdn.example/avatar-new.png" },
    })
    const toast = vi.fn()
    const setCurrentAvatarUrl = vi.fn()

    const result = await submitAvatarUpload({
      file,
      updateUserAvatar,
      toast,
      refresh,
      setCurrentAvatarUrl,
    })

    expect(updateUserAvatar).toHaveBeenCalledTimes(1)
    expect(updateUserAvatar).toHaveBeenCalledWith(expect.any(FormData))
    expect((updateUserAvatar.mock.calls[0][0] as FormData).get("avatar")).toBe(file)
    expect(setCurrentAvatarUrl).toHaveBeenCalledWith("https://cdn.example/avatar-new.png")
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ảnh đại diện đã được cập nhật",
      })
    )
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: true,
      data: { avatarUrl: "https://cdn.example/avatar-new.png" },
    })
  })

  it("shows an error toast and skips refresh when the update fails", async () => {
    const file = new File(["avatar"], "avatar.png", { type: "image/png" })
    const updateUserAvatar = vi.fn().mockResolvedValue({
      success: false,
      error: "Không thể cập nhật ảnh đại diện.",
      code: "PROFILE_UPDATE_ERROR",
    })
    const toast = vi.fn()
    const setCurrentAvatarUrl = vi.fn()

    const result = await submitAvatarUpload({
      file,
      updateUserAvatar,
      toast,
      refresh,
      setCurrentAvatarUrl,
    })

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Không thể cập nhật ảnh đại diện",
      })
    )
    expect(refresh).not.toHaveBeenCalled()
    expect(setCurrentAvatarUrl).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      error: "Không thể cập nhật ảnh đại diện.",
      code: "PROFILE_UPDATE_ERROR",
    })
  })
})

describe("AvatarUploader", () => {
  it("renders the hidden file input and the initial trigger state", () => {
    const markup = renderToStaticMarkup(
      createElement(AvatarUploader, {
        name: "Nguyen Van A",
        avatarUrl: "https://cdn.example/avatar.png",
        variant: "settings",
      })
    )

    expect(markup).toContain('type="file"')
    expect(markup).toContain('accept="image/jpeg,image/png,image/webp,image/gif"')
    expect(markup).toContain("Đổi ảnh đại diện")
    expect(markup).not.toContain("Lưu ảnh")
    expect(markup).not.toContain("Hủy")
  })
})
