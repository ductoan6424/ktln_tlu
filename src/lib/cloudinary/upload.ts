import { Buffer } from "node:buffer"
import { cloudinary } from "@/lib/cloudinary/client"
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/utils/constants"
import {
  CHAT_ALLOWED_FILE_MIME_TYPES,
  CHAT_MAX_FILE_SIZE,
  CHAT_MAX_IMAGE_SIZE,
} from "@/lib/config/chat"

const DEFAULT_POST_IMAGE_FOLDER = "uniconnect/posts"
const DEFAULT_AVATAR_IMAGE_FOLDER = "uniconnect/avatars"
const DEFAULT_CHAT_ATTACHMENT_FOLDER = "uniconnect/chat"

export type UploadedChatAttachment = {
  url: string
  type: "image" | "file"
  name: string
  mimeType: string
  sizeBytes: number
}

export class UploadValidationError extends Error {}

function assertValidImageFile(file: File) {
  if (file.size <= 0) {
    throw new UploadValidationError("Ảnh tải lên không hợp lệ.")
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new UploadValidationError("Ảnh vượt quá dung lượng tối đa 5MB.")
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new UploadValidationError("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.")
  }
}

async function uploadImage(file: File, folder: string) {
  assertValidImageFile(file)

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (
    !cloudName ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary environment variables are missing.")
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const base64 = fileBuffer.toString("base64")
  const dataUri = `data:${file.type};base64,${base64}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image",
  })

  return result.secure_url
}

function getFileName(file: File) {
  const trimmed = file.name.trim()
  return trimmed.length > 0 ? trimmed : "tep-dinh-kem"
}

function getMimeType(file: File) {
  return file.type || "application/octet-stream"
}

function isImageFile(file: File) {
  return ALLOWED_IMAGE_TYPES.includes(file.type)
}

function assertValidChatAttachment(file: File) {
  if (file.size <= 0) {
    throw new UploadValidationError("Tệp đính kèm không hợp lệ.")
  }

  if (isImageFile(file)) {
    if (file.size > CHAT_MAX_IMAGE_SIZE) {
      throw new UploadValidationError("Ảnh vượt quá dung lượng tối đa 8MB.")
    }
    return
  }

  const isAllowed = CHAT_ALLOWED_FILE_MIME_TYPES.includes(
    getMimeType(file) as (typeof CHAT_ALLOWED_FILE_MIME_TYPES)[number],
  )

  if (!isAllowed) {
    throw new UploadValidationError("Định dạng tệp chưa được hỗ trợ.")
  }

  if (file.size > CHAT_MAX_FILE_SIZE) {
    throw new UploadValidationError("Tệp vượt quá dung lượng tối đa 20MB.")
  }
}

export async function uploadChatAttachment(file: File): Promise<UploadedChatAttachment> {
  assertValidChatAttachment(file)

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const base64 = fileBuffer.toString("base64")
  const mimeType = getMimeType(file)
  const dataUri = `data:${mimeType};base64,${base64}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: process.env.CLOUDINARY_CHAT_FOLDER ?? DEFAULT_CHAT_ATTACHMENT_FOLDER,
    resource_type: isImageFile(file) ? "image" : "raw",
    use_filename: true,
    unique_filename: true,
    filename_override: getFileName(file),
  })

  return {
    url: result.secure_url,
    type: isImageFile(file) ? "image" : "file",
    name: getFileName(file),
    mimeType,
    sizeBytes: file.size,
  }
}

export async function uploadPostImage(file: File) {
  return uploadImage(
    file,
    process.env.CLOUDINARY_POSTS_FOLDER ?? DEFAULT_POST_IMAGE_FOLDER,
  )
}

export async function uploadAvatarImage(file: File) {
  return uploadImage(
    file,
    process.env.CLOUDINARY_AVATARS_FOLDER ?? DEFAULT_AVATAR_IMAGE_FOLDER,
  )
}
