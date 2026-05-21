import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const uploadAvatarImage = vi.hoisted(() => vi.fn())
const uploadCoverImage = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/cloudinary/upload", () => ({
  UploadValidationError: class UploadValidationError extends Error {},
  uploadAvatarImage,
  uploadCoverImage,
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { updateUserAvatar, updateUserProfile } from "@/actions/profile"

function createValidFile() {
  return new File(["avatar-binary"], "avatar.png", { type: "image/png" })
}

function createAvatarFormData(file?: File) {
  const formData = new FormData()

  if (file) {
    formData.append("avatar", file)
  }

  return formData
}

function mockNoSession() {
  const updateUser = vi.fn()

  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      updateUser,
    },
  } as unknown as SupabaseClient)

  return { updateUser }
}

function mockWithSession(userId = "user-self") {
  const updateUser = vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null })

  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
      updateUser,
    },
  } as unknown as SupabaseClient)

  return { updateUser }
}

function mockAvatarRecord(avatarUrl: string | null) {
  prisma.userProfile.findUnique.mockResolvedValue({
    avatarUrl,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("updateUserAvatar", () => {
  it("returns UNAUTHORIZED when there is no active session", async () => {
    mockNoSession()

    const result = await updateUserAvatar(createAvatarFormData(createValidFile()))

    expect(result).toEqual({
      success: false,
      error: "Bạn cần đăng nhập để thực hiện",
      code: "UNAUTHORIZED",
    })
  })

  it("returns VALIDATION_ERROR when avatar file is missing", async () => {
    mockWithSession()

    const result = await updateUserAvatar(createAvatarFormData())

    expect(result).toEqual({
      success: false,
      error: "Ảnh tải lên không hợp lệ.",
      code: "VALIDATION_ERROR",
    })
  })

  it("returns UPLOAD_VALIDATION_ERROR when the avatar file is rejected by validation", async () => {
    mockWithSession()

    const { UploadValidationError } = await import("@/lib/cloudinary/upload")
    uploadAvatarImage.mockRejectedValue(new UploadValidationError("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF."))

    const result = await updateUserAvatar(createAvatarFormData(createValidFile()))

    expect(result).toEqual({
      success: false,
      error: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.",
      code: "UPLOAD_VALIDATION_ERROR",
    })
  })

  it("returns UPLOAD_ERROR when avatar upload throws a generic exception", async () => {
    mockWithSession()
    uploadAvatarImage.mockRejectedValue(new Error("network down"))

    const result = await updateUserAvatar(createAvatarFormData(createValidFile()))

    expect(result).toEqual({
      success: false,
      error: "Không thể tải ảnh lên. Vui lòng thử lại.",
      code: "UPLOAD_ERROR",
    })
  })

  it("returns PROFILE_UPDATE_ERROR when Prisma update fails", async () => {
    mockWithSession()
    mockAvatarRecord("https://cdn.example/old.png")
    uploadAvatarImage.mockResolvedValue("https://cdn.example/avatar-self.png")
    prisma.userProfile.update.mockRejectedValue(new Error("db failed"))

    const result = await updateUserAvatar(createAvatarFormData(createValidFile()))

    expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-self" },
      select: { avatarUrl: true },
    })
    expect(result).toEqual({
      success: false,
      error: "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
      code: "PROFILE_UPDATE_ERROR",
    })
  })

  it("returns PROFILE_UPDATE_ERROR and rolls Prisma back when Supabase metadata sync fails", async () => {
    const { updateUser } = mockWithSession("user-self")
    mockAvatarRecord("https://cdn.example/old.png")
    uploadAvatarImage.mockResolvedValue("https://cdn.example/avatar-self.png")
    prisma.userProfile.update.mockResolvedValue({
      userId: "user-self",
      avatarUrl: "https://cdn.example/avatar-self.png",
    })
    prisma.userProfile.updateMany.mockResolvedValue({ count: 1 })
    updateUser.mockResolvedValue({ data: null, error: { message: "sync failed" } })

    const result = await updateUserAvatar(createAvatarFormData(createValidFile()))

    expect(prisma.userProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-self", avatarUrl: "https://cdn.example/avatar-self.png" },
      data: { avatarUrl: "https://cdn.example/old.png" },
    })
    expect(result).toEqual({
      success: false,
      error: "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
      code: "PROFILE_UPDATE_ERROR",
    })
  })

  it("uses CAS semantics for rollback so stale requests only revert the avatar they wrote", async () => {
    const { updateUser } = mockWithSession("user-self")
    mockAvatarRecord("https://cdn.example/old.png")
    uploadAvatarImage.mockResolvedValue("https://cdn.example/avatar-self-v2.png")
    prisma.userProfile.update.mockResolvedValue({
      userId: "user-self",
      avatarUrl: "https://cdn.example/avatar-self-v2.png",
    })
    prisma.userProfile.updateMany.mockResolvedValue({ count: 0 })
    updateUser.mockResolvedValue({ data: null, error: { message: "sync failed" } })

    const result = await updateUserAvatar(createAvatarFormData(createValidFile()))

    expect(prisma.userProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-self", avatarUrl: "https://cdn.example/avatar-self-v2.png" },
      data: { avatarUrl: "https://cdn.example/old.png" },
    })
    expect(result).toEqual({
      success: false,
      error: "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
      code: "PROFILE_UPDATE_ERROR",
    })
  })

  it("updates Prisma, syncs Supabase metadata, and revalidates the main surfaces when upload succeeds", async () => {
    const { updateUser } = mockWithSession("user-self")
    mockAvatarRecord("https://cdn.example/old.png")
    uploadAvatarImage.mockResolvedValue("https://cdn.example/avatar-self.png")
    prisma.userProfile.update.mockResolvedValue({
      userId: "user-self",
      avatarUrl: "https://cdn.example/avatar-self.png",
    })
    updateUser.mockResolvedValue({ data: { user: { id: "user-self" } }, error: null })

    const result = await updateUserAvatar(createAvatarFormData(createValidFile()))

    expect(uploadAvatarImage).toHaveBeenCalledTimes(1)
    expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-self" },
      select: { avatarUrl: true },
    })
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-self" },
      data: { avatarUrl: "https://cdn.example/avatar-self.png" },
    })
    expect(updateUser).toHaveBeenCalledWith({
      data: { avatar_url: "https://cdn.example/avatar-self.png" },
    })
    expect(revalidatePath).toHaveBeenCalledTimes(4)
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/settings")
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/profile")
    expect(revalidatePath).toHaveBeenNthCalledWith(3, "/feed")
    expect(revalidatePath).toHaveBeenNthCalledWith(4, "/profile/user-self")
    expect(result).toEqual({
      success: true,
      data: { avatarUrl: "https://cdn.example/avatar-self.png" },
    })
  })
})

describe("updateUserProfile", () => {
  it("returns UNAUTHORIZED when there is no active session", async () => {
    mockNoSession()

    const result = await updateUserProfile({
      displayName: "Nguyen Van A",
      bio: "Sinh vien nam cuoi",
    })

    expect(result).toEqual({
      success: false,
      error: "Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ thá»±c hiá»‡n",
      code: "UNAUTHORIZED",
    })
    expect(prisma.userProfile.update).not.toHaveBeenCalled()
  })

  it("validates display name before updating the profile", async () => {
    mockWithSession()

    const result = await updateUserProfile({
      displayName: "A",
      bio: "Bio hop le",
    })

    expect(result).toEqual({
      success: false,
      error: "Há» vĂ  tĂªn pháº£i cĂ³ tá»« 2 Ä‘áº¿n 100 kĂ½ tá»±.",
      code: "VALIDATION_ERROR",
    })
    expect(prisma.userProfile.update).not.toHaveBeenCalled()
  })

  it("updates editable profile fields, syncs auth metadata, and revalidates profile surfaces", async () => {
    const { updateUser } = mockWithSession("user-self")
    prisma.userProfile.update.mockResolvedValue({
      userId: "user-self",
      displayName: "Nguyen Van B",
      bio: "Bio moi",
    })

    const result = await updateUserProfile({
      displayName: "  Nguyen Van B  ",
      bio: "  Bio moi  ",
    })

    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-self" },
      data: {
        displayName: "Nguyen Van B",
        bio: "Bio moi",
      },
      select: {
        displayName: true,
        bio: true,
      },
    })
    expect(updateUser).toHaveBeenCalledWith({
      data: { display_name: "Nguyen Van B" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/settings")
    expect(revalidatePath).toHaveBeenCalledWith("/profile")
    expect(revalidatePath).toHaveBeenCalledWith("/profile/user-self")
    expect(revalidatePath).toHaveBeenCalledWith("/feed")
    expect(result).toEqual({
      success: true,
      data: {
        displayName: "Nguyen Van B",
        bio: "Bio moi",
      },
    })
  })
})
