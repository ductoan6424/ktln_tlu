import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

const createClient = vi.hoisted(() => vi.fn())
const uploadAvatarImage = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    update: vi.fn(),
  },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/cloudinary/upload", () => ({ uploadAvatarImage }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { updateUserAvatar } from "@/actions/profile"

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

  it("updates Prisma, syncs Supabase metadata, and revalidates the main surfaces when upload succeeds", async () => {
    const { updateUser } = mockWithSession("user-self")
    uploadAvatarImage.mockResolvedValue("https://cdn.example/avatar-self.png")
    prisma.userProfile.update.mockResolvedValue({
      userId: "user-self",
      avatarUrl: "https://cdn.example/avatar-self.png",
    })
    updateUser.mockResolvedValue({ data: { user: { id: "user-self" } }, error: null })

    const result = await updateUserAvatar(createAvatarFormData(createValidFile()))

    expect(uploadAvatarImage).toHaveBeenCalledTimes(1)
    expect(prisma.userProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-self" },
      data: { avatarUrl: "https://cdn.example/avatar-self.png" },
    })
    expect(updateUser).toHaveBeenCalledWith({
      data: { avatar_url: "https://cdn.example/avatar-self.png" },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/settings")
    expect(revalidatePath).toHaveBeenCalledWith("/profile")
    expect(revalidatePath).toHaveBeenCalledWith("/feed")
    expect(revalidatePath).toHaveBeenCalledWith("/profile/user-self")
    expect(result).toEqual({
      success: true,
      data: { avatarUrl: "https://cdn.example/avatar-self.png" },
    })
  })
})
