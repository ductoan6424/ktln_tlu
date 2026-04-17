import { Buffer } from "node:buffer"
import { cloudinary } from "@/lib/cloudinary/client"
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/utils/constants"

const DEFAULT_POST_IMAGE_FOLDER = "uniconnect/posts"

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

export async function uploadPostImage(file: File) {
  assertValidImageFile(file)

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

  if (!cloudName || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary environment variables are missing.")
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const base64 = fileBuffer.toString("base64")
  const dataUri = `data:${file.type};base64,${base64}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: process.env.CLOUDINARY_POSTS_FOLDER ?? DEFAULT_POST_IMAGE_FOLDER,
    resource_type: "image",
  })

  return result.secure_url
}
