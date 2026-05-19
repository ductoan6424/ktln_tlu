"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface ProfileShareButtonProps {
  profileUserId: string
  displayName: string
  className?: string
}

type NavigatorWithShare = Navigator & {
  share?: (data: ShareData) => Promise<void>
}

export function buildProfileShareUrl(profileUserId: string, origin?: string) {
  const resolvedOrigin =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "")
  const normalizedOrigin = resolvedOrigin.replace(/\/$/, "")

  return `${normalizedOrigin}/profile/${encodeURIComponent(profileUserId)}`
}

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  Object.assign(textarea.style, {
    opacity: "0",
    position: "fixed",
  })
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

export function ProfileShareButton({
  profileUserId,
  displayName,
  className,
}: ProfileShareButtonProps) {
  const { toast } = useToast()
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (isSharing) return

    const url = buildProfileShareUrl(profileUserId)
    const shareData = {
      title: `Hồ sơ của ${displayName}`,
      text: `Xem hồ sơ của ${displayName}`,
      url,
    }

    setIsSharing(true)

    try {
      const shareNavigator = navigator as NavigatorWithShare

      if (shareNavigator.share) {
        await shareNavigator.share(shareData)
        return
      }

      await copyTextToClipboard(url)
      toast({
        description: "Đã sao chép liên kết hồ sơ.",
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }

      try {
        await copyTextToClipboard(url)
        toast({
          description: "Đã sao chép liên kết hồ sơ.",
        })
      } catch {
        toast({
          description: "Không thể chia sẻ hồ sơ. Vui lòng thử lại.",
          variant: "destructive",
        })
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Chia sẻ"
      className={cn("rounded-lg", className)}
      disabled={isSharing}
      onClick={handleShare}
    >
      <Share2 className="size-5" />
    </Button>
  )
}
