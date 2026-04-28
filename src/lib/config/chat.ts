export const CHAT_PAGE_SIZE = 20
export const CHAT_INPUT_MAX_LENGTH = 2000
export const CHAT_MAX_IMAGE_SIZE = 8 * 1024 * 1024
export const CHAT_MAX_FILE_SIZE = 20 * 1024 * 1024
export const CHAT_TYPING_TIMEOUT_MS = 2500
export const CHAT_TYPING_THROTTLE_MS = 800
export const CHAT_PRESENCE_CHANNEL = "presence:users"

export const CHAT_ALLOWED_FILE_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-rar-compressed",
  "text/plain",
] as const

export const CHAT_FILE_INPUT_ACCEPT = [
  "image/*",
  ...CHAT_ALLOWED_FILE_MIME_TYPES,
].join(",")

export function getChatChannelName(conversationId: string) {
  return `chat:${conversationId}`
}
