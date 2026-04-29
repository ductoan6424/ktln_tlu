"use client"

import { useState } from "react"
import { POST_LONG_THRESHOLD } from "@/lib/config/posts"
import { cn } from "@/lib/utils"

interface PostContentProps {
  content: string
  threshold?: number
  defaultExpanded?: boolean
  className?: string
}

export function PostContent({
  content,
  threshold = POST_LONG_THRESHOLD,
  defaultExpanded = false,
  className,
}: PostContentProps) {
  const isLong = content.length > threshold
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!content) return null

  const shouldTruncate = isLong && !isExpanded
  const visibleContent = shouldTruncate
    ? content.slice(0, threshold).trimEnd()
    : content

  const handleExpand = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsExpanded(true)
  }

  return (
    <p
      className={cn(
        "text-[13px] leading-snug whitespace-pre-wrap break-words",
        className
      )}
    >
      {visibleContent}
      {shouldTruncate && (
        <>
          {"… "}
          <button
            type="button"
            onClick={handleExpand}
            className="text-primary font-semibold hover:underline focus-visible:underline"
            data-action="expand-post-content"
          >
            Xem thêm
          </button>
        </>
      )}
    </p>
  )
}
