// Config cho tính năng khảo sát (poll)

export const POLL_QUESTION_MIN_LENGTH = 1
export const POLL_QUESTION_MAX_LENGTH = 200

export const POLL_OPTION_MIN_LENGTH = 1
export const POLL_OPTION_MAX_LENGTH = 80

export const POLL_OPTIONS_MIN_COUNT = 2
export const POLL_OPTIONS_MAX_COUNT = 10

// Preset thời hạn (giây). null = không hết hạn
export const POLL_REALTIME_CHANNEL_PREFIX = "poll"
export const POLL_REALTIME_EVENT_UPDATED = "poll.updated"

export const POLL_DURATION_PRESETS = {
  "1h": 60 * 60,
  "1d": 24 * 60 * 60,
  "3d": 3 * 24 * 60 * 60,
  "7d": 7 * 24 * 60 * 60,
  never: null,
} as const

export type PollDurationPreset = keyof typeof POLL_DURATION_PRESETS

// Tên kênh Ably cho realtime update vote (dùng ở phase sau)
export const POLL_CHANNEL_PREFIX = "polls"
export const POLL_EVENT_VOTE_UPDATED = "vote_updated"
export const POLL_EVENT_POLL_CLOSED = "poll_closed"
