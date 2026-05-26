import { beforeEach, describe, expect, it, vi } from "vitest"

const upload = vi.hoisted(() => vi.fn())

vi.mock("@/lib/cloudinary/client", () => ({
  cloudinary: {
    uploader: {
      upload,
    },
  },
}))

import {
  uploadAnnouncementAttachment,
  uploadAvatarImage,
  uploadPostImage,
} from "@/lib/cloudinary/upload"

function createImageFile({
  name = "avatar.png",
  type = "image/png",
  size = 1024,
}: {
  name?: string
  type?: string
  size?: number
} = {}) {
  return new File([new Uint8Array(size).fill(1)], name, { type })
}

beforeEach(() => {
  upload.mockReset()
  process.env.CLOUDINARY_API_KEY = "key"
  process.env.CLOUDINARY_API_SECRET = "secret"
  process.env.CLOUDINARY_CLOUD_NAME = "cloud"
  process.env.CLOUDINARY_POSTS_FOLDER = "uniconnect/test-posts"
  process.env.CLOUDINARY_AVATARS_FOLDER = "uniconnect/test-avatars"
  process.env.CLOUDINARY_ANNOUNCEMENT_ATTACHMENTS_FOLDER =
    "uniconnect/test-announcement-attachments"
})

describe("uploadAvatarImage", () => {
  it("rejects unsupported image types with UploadValidationError", async () => {
    const file = createImageFile({ name: "avatar.txt", type: "text/plain" })

    await expect(uploadAvatarImage(file)).rejects.toThrow(
      "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.",
    )
  })

  it("rejects files larger than max size with UploadValidationError", async () => {
    const file = createImageFile({ size: 5 * 1024 * 1024 + 1 })

    await expect(uploadAvatarImage(file)).rejects.toThrow(
      "Ảnh vượt quá dung lượng tối đa 5MB.",
    )
  })

  it("uploads valid avatars to the configured folder and returns secure_url", async () => {
    upload.mockResolvedValue({ secure_url: "https://cdn.example.com/avatar.png" })
    const file = createImageFile()

    await expect(uploadAvatarImage(file)).resolves.toBe(
      "https://cdn.example.com/avatar.png",
    )

    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining("data:image/png;base64,"),
      expect.objectContaining({
        folder: "uniconnect/test-avatars",
        resource_type: "image",
      }),
    )
  })
})

describe("uploadPostImage", () => {
  it("uploads post images to the configured post folder", async () => {
    upload.mockResolvedValue({ secure_url: "https://cdn.example.com/post.png" })
    const file = createImageFile({ name: "post.png" })

    await expect(uploadPostImage(file)).resolves.toBe(
      "https://cdn.example.com/post.png",
    )

    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining("data:image/png;base64,"),
      expect.objectContaining({
        folder: "uniconnect/test-posts",
        resource_type: "image",
      }),
    )
  })
})

describe("uploadAnnouncementAttachment", () => {
  it("uploads an official notice PDF through the configured raw attachment folder", async () => {
    upload.mockResolvedValue({ secure_url: "https://cdn.example.com/notice.pdf" })
    const file = new File(["notice"], "notice.pdf", { type: "application/pdf" })

    await expect(uploadAnnouncementAttachment(file)).resolves.toEqual({
      url: "https://cdn.example.com/notice.pdf",
      type: "FILE",
      name: "notice.pdf",
      mimeType: "application/pdf",
      sizeBytes: file.size,
    })

    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining("data:application/pdf;base64,"),
      expect.objectContaining({
        folder: "uniconnect/test-announcement-attachments",
        resource_type: "raw",
        filename_override: "notice.pdf",
      }),
    )
  })
})
