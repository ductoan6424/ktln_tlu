import type { PollType } from "@prisma/client"

// Dữ liệu 1 option để hiển thị
export type PollOptionView = {
  id: string
  content: string
  position: number
  voteCount: number
  percentage: number
  isVotedByMe: boolean
}

// Dữ liệu poll đầy đủ để render lên UI
export type PollView = {
  id: string
  postId: string
  question: string
  type: PollType
  closedAt: string | null
  closedEarly: boolean
  createdAt: string
  totalVotes: number
  // Tổng số người đã tham gia (unique voters) — khác totalVotes khi type=MULTIPLE
  totalVoters: number
  options: PollOptionView[]
  isClosed: boolean
  canVote: boolean
  myOptionIds: string[]
}

// Input khi tạo poll (đã được validate qua pollInputSchema)
export type CreatePollPayload = {
  question: string
  type: PollType
  options: Array<{ content: string }>
  // Thời điểm đóng poll (null = không giới hạn). Được tính từ durationPreset.
  closedAt: Date | null
}
