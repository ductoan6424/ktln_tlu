"use client"

import { useState, useCallback, useRef, type ReactNode } from "react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { getPostLikers } from "@/actions/posts"
import { Loader2 } from "lucide-react"

interface LikersTooltipProps {
  postId?: string
  children: ReactNode
}

export function LikersTooltip({ postId, children }: LikersTooltipProps) {
  const [likers, setLikers] = useState<
    { displayName: string; avatarUrl: string | null }[] | null
  >(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  const fetchLikers = useCallback(async () => {
    if (!postId || fetchedRef.current) return
    fetchedRef.current = true
    setLoading(true)
    const result = await getPostLikers(postId)
    if (result.success && result.data) {
      setLikers(result.data.users)
      setTotal(result.data.total)
    }
    setLoading(false)
  }, [postId])

  if (!postId) return <>{children}</>

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onMouseEnter={fetchLikers}
          onFocus={fetchLikers}
          className="cursor-default"
        >
          {children}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[220px] px-3 py-2 text-xs leading-relaxed"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin mx-auto" />
          ) : likers && likers.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {likers.map((u) => (
                <span key={u.displayName} className="truncate">{u.displayName}</span>
              ))}
              {total > likers.length && (
                <span className="text-muted-background/70 mt-0.5">
                  và {total - likers.length} người khác
                </span>
              )}
            </div>
          ) : (
            <span>Chưa có lượt thích</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
