const DEFAULT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const COMMUNITY_ATTACHMENT_MAX_BYTES = parsePositiveInt(
  process.env.COMMUNITY_ATTACHMENT_MAX_BYTES,
  DEFAULT_ATTACHMENT_MAX_BYTES,
)

export const COMMUNITY_ALLOWED_FILE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-rar-compressed",
] as const

export const COMMUNITY_DEFAULT_CHAT_MODE = "OPEN" as const
