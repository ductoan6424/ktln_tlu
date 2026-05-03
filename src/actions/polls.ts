"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { getPollForPost } from "@/lib/polls/queries"
import { publishPollUpdate } from "@/lib/polls/realtime"
import type { PollView } from "@/lib/polls/types"
import {
  notifyPollClosed,
  notifyPollVote,
  withdrawPollVoteNotification,
} from "@/lib/notifications/dispatchers"
import type { NotificationActorSummary } from "@/lib/notifications/types"

async function getActorSummary(
  userId: string,
): Promise<NotificationActorSummary | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { userId: true, displayName: true, avatarUrl: true },
  })
  if (!profile) return null
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  }
}

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user.id
}

// Lấy poll view (dùng cho refresh client-side sau khi vote)
export async function getPollView(
  postId: string,
): Promise<ActionResult<PollView | null>> {
  if (!postId || typeof postId !== "string") {
    return errorResult("Bài viết không hợp lệ.", "VALIDATION_ERROR")
  }

  try {
    const userId = await getCurrentUserId()
    const view = await getPollForPost(postId, userId)
    return successResult(view)
  } catch (error) {
    console.error("getPollView error:", error)
    return errorResult("Không thể tải khảo sát.")
  }
}

// Vote hoặc thay đổi vote. optionIds phải thuộc cùng 1 poll.
// - Poll SINGLE: optionIds tối đa 1, ghi đè vote cũ.
// - Poll MULTIPLE: set optionIds mới thay thế tất cả vote cũ của user trong poll.
// - optionIds rỗng = hủy vote (rút phiếu).
export async function voteOnPoll(input: {
  pollId: string
  optionIds: string[]
}): Promise<ActionResult<PollView>> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return errorResult("Bạn cần đăng nhập để bình chọn.", "UNAUTHORIZED")
  }

  if (!input?.pollId || typeof input.pollId !== "string") {
    return errorResult("Khảo sát không hợp lệ.", "VALIDATION_ERROR")
  }

  if (!Array.isArray(input.optionIds)) {
    return errorResult("Lựa chọn không hợp lệ.", "VALIDATION_ERROR")
  }

  const optionIds = Array.from(new Set(input.optionIds.filter((id) => typeof id === "string")))

  try {
    const poll = await prisma.poll.findUnique({
      where: { id: input.pollId },
      select: {
        id: true,
        postId: true,
        type: true,
        question: true,
        closedAt: true,
        options: { select: { id: true } },
        post: { select: { authorId: true } },
      },
    })

    if (!poll) {
      return errorResult("Khảo sát không tồn tại.", "NOT_FOUND")
    }

    // Kiểm tra đã đóng chưa
    if (poll.closedAt && poll.closedAt.getTime() <= Date.now()) {
      return errorResult("Khảo sát đã đóng.", "POLL_CLOSED")
    }

    // Kiểm tra option thuộc poll
    const validOptionIds = new Set(poll.options.map((option) => option.id))
    for (const optionId of optionIds) {
      if (!validOptionIds.has(optionId)) {
        return errorResult("Lựa chọn không thuộc khảo sát này.", "VALIDATION_ERROR")
      }
    }

    if (poll.type === "SINGLE" && optionIds.length > 1) {
      return errorResult("Khảo sát này chỉ cho phép chọn 1 đáp án.", "VALIDATION_ERROR")
    }

    // Kiểm tra user đã từng vote trong poll này chưa (dùng để quyết định withdraw noti)
    const previousVoteCount = await prisma.pollVote.count({
      where: { pollId: poll.id, userId },
    })
    const hadPreviousVote = previousVoteCount > 0

    // Transaction: xóa vote cũ của user trong poll, tạo vote mới
    await prisma.$transaction(async (tx) => {
      await tx.pollVote.deleteMany({
        where: { pollId: poll.id, userId },
      })

      if (optionIds.length > 0) {
        await tx.pollVote.createMany({
          data: optionIds.map((optionId) => ({
            pollId: poll.id,
            optionId,
            userId,
          })),
        })
      }
    })

    // Trả lại view mới
    const view = await getPollForPost(poll.postId, userId)
    if (!view) {
      return errorResult("Không thể tải lại khảo sát.", "INTERNAL_ERROR")
    }

    revalidatePath("/feed")

    // ── Notifications + Realtime ──
    const authorId = poll.post.authorId
    const isSelfVote = authorId === userId

    if (!isSelfVote) {
      if (optionIds.length > 0) {
        const actor = await getActorSummary(userId)
        if (actor) {
          await notifyPollVote({
            actor,
            recipientId: authorId,
            postId: poll.postId,
            pollId: poll.id,
            pollQuestion: poll.question,
          })
        }
      } else if (hadPreviousVote) {
        // Rút phiếu → thu hồi noti đã gửi trước đó (nếu có)
        await withdrawPollVoteNotification({
          recipientId: authorId,
          actorId: userId,
          pollId: poll.id,
        })
      }
    }

    // Realtime: broadcast poll đã update
    await publishPollUpdate(poll.postId, view)

    return successResult(view)
  } catch (error) {
    console.error("voteOnPoll error:", error)
    return errorResult("Không thể bình chọn. Vui lòng thử lại.")
  }
}

// Author đóng poll sớm
export async function closePoll(input: {
  pollId: string
}): Promise<ActionResult<PollView>> {
  const userId = await getCurrentUserId()
  if (!userId) {
    return errorResult("Bạn cần đăng nhập.", "UNAUTHORIZED")
  }

  if (!input?.pollId || typeof input.pollId !== "string") {
    return errorResult("Khảo sát không hợp lệ.", "VALIDATION_ERROR")
  }

  try {
    const poll = await prisma.poll.findUnique({
      where: { id: input.pollId },
      select: {
        id: true,
        postId: true,
        question: true,
        closedAt: true,
        post: { select: { authorId: true } },
      },
    })

    if (!poll) {
      return errorResult("Khảo sát không tồn tại.", "NOT_FOUND")
    }

    if (poll.post.authorId !== userId) {
      return errorResult("Bạn không có quyền đóng khảo sát này.", "FORBIDDEN")
    }

    if (poll.closedAt && poll.closedAt.getTime() <= Date.now()) {
      return errorResult("Khảo sát đã đóng từ trước.", "POLL_CLOSED")
    }

    await prisma.poll.update({
      where: { id: poll.id },
      data: {
        closedAt: new Date(),
        closedEarly: true,
      },
    })

    const view = await getPollForPost(poll.postId, userId)
    if (!view) {
      return errorResult("Không thể tải lại khảo sát.", "INTERNAL_ERROR")
    }

    revalidatePath("/feed")

    // ── Notifications + Realtime ──
    // Gửi notify POLL_CLOSED cho tất cả voters (trừ author)
    const voters = await prisma.pollVote.findMany({
      where: { pollId: poll.id, userId: { not: userId } },
      distinct: ["userId"],
      select: { userId: true },
    })

    await Promise.all(
      voters.map((voter) =>
        notifyPollClosed({
          recipientId: voter.userId,
          postId: poll.postId,
          pollId: poll.id,
          pollQuestion: poll.question,
        }),
      ),
    )

    await publishPollUpdate(poll.postId, view)

    return successResult(view)
  } catch (error) {
    console.error("closePoll error:", error)
    return errorResult("Không thể đóng khảo sát. Vui lòng thử lại.")
  }
}
