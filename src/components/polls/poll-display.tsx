"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { BarChart3, Check, Loader2, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { closePoll, voteOnPoll } from "@/actions/polls"
import type { PollView } from "@/lib/polls/types"
import { usePollRealtime } from "@/hooks/use-poll-realtime"

interface PollDisplayProps {
  poll: PollView
  currentUserId: string | null
  authorId: string
  className?: string
}

// Format thời gian còn lại theo tiếng Việt
function formatRemaining(closedAt: string | null): string | null {
  if (!closedAt) return null
  const diffMs = new Date(closedAt).getTime() - Date.now()
  if (diffMs <= 0) return null
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ`
  const days = Math.floor(hours / 24)
  return `${days} ngày`
}

export function PollDisplay({
  poll: initialPoll,
  currentUserId,
  authorId,
  className,
}: PollDisplayProps) {
  const [pollOverride, setPollOverride] = useState<PollView | null>(null)
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(
    () => new Set(initialPoll.myOptionIds),
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const poll = pollOverride ?? initialPoll

  // Đồng bộ lại state khi parent truyền poll mới (vd: sau revalidate hoặc realtime update)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync từ prop khi parent revalidate poll
    setPollOverride(null)
    setSelectedOptionIds(new Set(initialPoll.myOptionIds))
  }, [initialPoll])

  // Realtime: khi có người khác vote/close poll, cập nhật các field công khai.
  // Giữ nguyên `myOptionIds`, `canVote`, `options[].isVotedByMe` của viewer hiện tại
  // vì payload được build từ góc nhìn của người vừa thực hiện hành động.
  const handleRealtimeUpdate = useCallback((incoming: PollView) => {
    setPollOverride((currentPoll) => {
      const current = currentPoll ?? initialPoll
      const myOptionIdSet = new Set(current.myOptionIds)
      const mergedOptions = incoming.options.map((opt) => ({
        id: opt.id,
        content: opt.content,
        position: opt.position,
        voteCount: opt.voteCount,
        percentage: opt.percentage,
        isVotedByMe: myOptionIdSet.has(opt.id),
      }))

      return {
        ...current,
        totalVotes: incoming.totalVotes,
        totalVoters: incoming.totalVoters,
        isClosed: incoming.isClosed,
        closedAt: incoming.closedAt,
        closedEarly: incoming.closedEarly,
        options: mergedOptions,
        // Nếu poll mới đóng, viewer không thể vote tiếp
        canVote: incoming.isClosed ? false : current.canVote,
      }
    })
  }, [initialPoll])

  usePollRealtime({ postId: initialPoll.postId, onUpdated: handleRealtimeUpdate })

  const remaining = useMemo(() => formatRemaining(poll.closedAt), [poll.closedAt])
  const isAuthor = currentUserId === authorId
  const hasVoted = poll.myOptionIds.length > 0
  const showResults = hasVoted || poll.isClosed

  const handleSelect = (optionId: string) => {
    if (!poll.canVote) return
    setError(null)

    setSelectedOptionIds((prev) => {
      const next = new Set(prev)
      if (poll.type === "SINGLE") {
        return new Set([optionId])
      }
      if (next.has(optionId)) {
        next.delete(optionId)
      } else {
        next.add(optionId)
      }
      return next
    })
  }

  const handleSubmitVote = () => {
    if (!poll.canVote) return
    const optionIds = Array.from(selectedOptionIds)
    if (optionIds.length === 0) {
      setError("Vui lòng chọn ít nhất 1 đáp án")
      return
    }

    startTransition(async () => {
      const result = await voteOnPoll({
        pollId: poll.id,
        optionIds,
      })
      if (!result.success || !result.data) {
        setError(result.error ?? "Không thể bình chọn")
        return
      }
      setPollOverride(result.data)
      setSelectedOptionIds(new Set(result.data.myOptionIds))
    })
  }

  const handleWithdraw = () => {
    if (!poll.canVote || !hasVoted) return
    setError(null)

    startTransition(async () => {
      const result = await voteOnPoll({
        pollId: poll.id,
        optionIds: [],
      })
      if (!result.success || !result.data) {
        setError(result.error ?? "Không thể thu hồi bình chọn")
        return
      }
        setPollOverride(result.data)
      setSelectedOptionIds(new Set())
    })
  }

  const handleClosePoll = () => {
    if (!isAuthor || poll.isClosed) return
    if (!window.confirm("Đóng khảo sát ngay? Không thể mở lại.")) return

    startTransition(async () => {
      const result = await closePoll({ pollId: poll.id })
      if (!result.success || !result.data) {
        setError(result.error ?? "Không thể đóng khảo sát")
        return
      }
      setPollOverride(result.data)
    })
  }

  return (
    <div
      role="presentation"
      className={cn(
        "rounded-xl border border-border bg-muted/30 p-3",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="size-4" />
          <span className="text-[11px] uppercase tracking-wide">
            {poll.type === "SINGLE" ? "Khảo sát (chọn 1)" : "Khảo sát (chọn nhiều)"}
          </span>
        </div>
        {poll.isClosed ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="size-3" />
            Đã đóng
          </span>
        ) : remaining ? (
          <span className="text-[11px] text-muted-foreground">
            Còn {remaining}
          </span>
        ) : null}
      </div>

      <p className="mb-3 text-[14px] font-medium text-foreground">
        {poll.question}
      </p>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const isSelected = selectedOptionIds.has(option.id)
          const isVotedByMe = option.isVotedByMe

          if (showResults) {
            return (
              <div
                key={option.id}
                className="relative overflow-hidden rounded-md border border-border bg-background"
              >
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all",
                    isVotedByMe ? "bg-primary/20" : "bg-muted",
                  )}
                  style={{ width: `${option.percentage}%` }}
                />
                <div className="relative flex items-center justify-between gap-2 px-3 py-2 text-[13px]">
                  <div className="flex min-w-0 items-center gap-2">
                    {isVotedByMe && (
                      <Check className="size-3.5 shrink-0 text-primary" />
                    )}
                    <span className="truncate font-medium text-foreground">
                      {option.content}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
                    <span className="tabular-nums">{option.percentage}%</span>
                    <span className="text-[11px]">({option.voteCount})</span>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              disabled={!poll.canVote || isPending}
              onClick={() => handleSelect(option.id)}
              aria-pressed={isSelected}
              className={cn(
                "h-auto w-full justify-start gap-2 px-3 py-2 text-[13px] font-normal",
                isSelected && "border-primary bg-primary/5 text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center border transition-colors",
                  poll.type === "SINGLE" ? "rounded-full" : "rounded-sm",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {isSelected && <Check className="size-3" />}
              </span>
              <span className="truncate">{option.content}</span>
            </Button>
          )
        })}
      </div>

      {error && (
        <p className="mt-2 text-[12px] text-destructive">{error}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {poll.totalVoters} người tham gia · {poll.totalVotes} lượt bình chọn
        </p>
        <div className="flex gap-1">
          {isAuthor && !poll.isClosed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[12px]"
              onClick={handleClosePoll}
              disabled={isPending}
            >
              Đóng khảo sát
            </Button>
          )}
          {!showResults && poll.canVote && (
            <Button
              type="button"
              size="sm"
              className="h-7 px-3 text-[12px]"
              onClick={handleSubmitVote}
              disabled={isPending || selectedOptionIds.size === 0}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Bình chọn"
              )}
            </Button>
          )}
          {hasVoted && poll.canVote && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[12px]"
              onClick={handleWithdraw}
              disabled={isPending}
            >
              Thu hồi
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
