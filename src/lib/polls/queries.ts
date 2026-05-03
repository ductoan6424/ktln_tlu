import { prisma } from "@/lib/prisma/client"

import type { PollOptionView, PollView } from "./types"

// Shape raw lấy từ Prisma (internal, không export)
type PollWithOptionsAndVotes = {
  id: string
  postId: string
  question: string
  type: "SINGLE" | "MULTIPLE"
  closedAt: Date | null
  closedEarly: boolean
  createdAt: Date
  options: Array<{
    id: string
    content: string
    position: number
    votes: Array<{ userId: string }>
  }>
}

// Tính PollView từ data raw. Tách riêng để testable (không chạm DB).
export function computePollView(
  poll: PollWithOptionsAndVotes,
  currentUserId: string | null,
): PollView {
  const totalVotes = poll.options.reduce(
    (sum, option) => sum + option.votes.length,
    0,
  )

  const voterSet = new Set<string>()
  for (const option of poll.options) {
    for (const vote of option.votes) {
      voterSet.add(vote.userId)
    }
  }
  const totalVoters = voterSet.size

  const now = Date.now()
  const isClosed = Boolean(
    poll.closedAt && poll.closedAt.getTime() <= now,
  )
  const canVote = Boolean(currentUserId) && !isClosed

  const myOptionIds: string[] = []

  const options: PollOptionView[] = poll.options.map((option) => {
    const voteCount = option.votes.length
    const percentage =
      totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 1000) / 10
    const isVotedByMe = currentUserId
      ? option.votes.some((vote) => vote.userId === currentUserId)
      : false
    if (isVotedByMe) {
      myOptionIds.push(option.id)
    }
    return {
      id: option.id,
      content: option.content,
      position: option.position,
      voteCount,
      percentage,
      isVotedByMe,
    }
  })

  // Sắp theo position tăng dần
  options.sort((a, b) => a.position - b.position)

  return {
    id: poll.id,
    postId: poll.postId,
    question: poll.question,
    type: poll.type,
    closedAt: poll.closedAt ? poll.closedAt.toISOString() : null,
    closedEarly: poll.closedEarly,
    createdAt: poll.createdAt.toISOString(),
    totalVotes,
    totalVoters,
    options,
    isClosed,
    canVote,
    myOptionIds,
  }
}

// Lấy poll kèm options + votes cho 1 post. Trả về null nếu post không có poll.
export async function getPollForPost(
  postId: string,
  currentUserId: string | null,
): Promise<PollView | null> {
  const poll = await prisma.poll.findUnique({
    where: { postId },
    include: {
      options: {
        include: {
          votes: { select: { userId: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  })

  if (!poll) {
    return null
  }

  return computePollView(poll, currentUserId)
}

// Batch: lấy polls cho nhiều post cùng lúc (feed list render)
export async function getPollsForPosts(
  postIds: string[],
  currentUserId: string | null,
): Promise<Map<string, PollView>> {
  if (postIds.length === 0) {
    return new Map()
  }

  const polls = await prisma.poll.findMany({
    where: { postId: { in: postIds } },
    include: {
      options: {
        include: {
          votes: { select: { userId: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  })

  const map = new Map<string, PollView>()
  for (const poll of polls) {
    map.set(poll.postId, computePollView(poll, currentUserId))
  }
  return map
}
