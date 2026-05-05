"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Loader2, Search, X } from "lucide-react"

import { createGroupConversation, searchChatUsers } from "@/actions/chat"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { ChatConversationItem, ChatUserSearchResult } from "@/types/chat"

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (conversation: ChatConversationItem) => void
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateGroupDialogProps) {
  const { toast } = useToast()
  const [groupName, setGroupName] = useState("")
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<ChatUserSearchResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ChatUserSearchResult[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedIds = useMemo(
    () => new Set(selectedUsers.map((user) => user.userId)),
    [selectedUsers],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    let isDisposed = false
    const timeoutId = setTimeout(async () => {
      setIsLoadingUsers(true)
      const result = await searchChatUsers({ query, limit: 20 })
      if (!isDisposed) {
        setUsers(result.success && result.data ? result.data : [])
        setIsLoadingUsers(false)
      }
    }, 200)

    return () => {
      isDisposed = true
      clearTimeout(timeoutId)
    }
  }, [open, query])

  const reset = () => {
    setGroupName("")
    setQuery("")
    setUsers([])
    setSelectedUsers([])
    setIsLoadingUsers(false)
    setIsSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      reset()
    }
  }

  const toggleUser = (user: ChatUserSearchResult) => {
    setSelectedUsers((prev) =>
      prev.some((item) => item.userId === user.userId)
        ? prev.filter((item) => item.userId !== user.userId)
        : [...prev, user],
    )
  }

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((item) => item.userId !== userId))
  }

  const handleCreate = async () => {
    if (selectedUsers.length < 2) {
      toast({
        title: "Chưa đủ thành viên",
        description: "Chọn ít nhất 2 thành viên để tạo nhóm chat.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const result = await createGroupConversation({
      name: groupName,
      participantIds: selectedUsers.map((user) => user.userId),
    })
    setIsSubmitting(false)

    if (!result.success || !result.data) {
      toast({
        title: "Không thể tạo nhóm",
        description: result.error ?? "Vui lòng thử lại.",
        variant: "destructive",
      })
      return
    }

    onCreated(result.data)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle>Tạo nhóm chat</DialogTitle>
          <DialogDescription>
            Chọn thành viên và đặt tên nhóm để bắt đầu trò chuyện.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-4 space-y-4">
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Tên nhóm"
            maxLength={80}
          />

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                  onClick={() => removeSelectedUser(user.userId)}
                >
                  <span className="max-w-32 truncate">{user.displayName}</span>
                  <X className="size-3" />
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm thành viên"
              className="pl-8"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Đang tìm thành viên...
              </div>
            ) : users.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Không tìm thấy thành viên phù hợp.
              </p>
            ) : (
              users.map((user) => {
                const isSelected = selectedIds.has(user.userId)

                return (
                  <button
                    key={user.userId}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted",
                      isSelected && "bg-primary/5",
                    )}
                    onClick={() => toggleUser(user)}
                  >
                    <UserAvatar
                      src={user.avatarUrl ?? undefined}
                      name={user.displayName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{user.displayName}</p>
                      {user.subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{user.subtitle}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter className="px-5">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting || selectedUsers.length < 2}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Đang tạo
              </span>
            ) : (
              "Tạo nhóm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
