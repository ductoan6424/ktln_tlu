"use client"

import { useEffect, useMemo, useReducer } from "react"
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
import { notifyContactGroupChanged } from "@/lib/contacts/events"
import { cn } from "@/lib/utils"
import type { ChatConversationItem, ChatUserSearchResult } from "@/types/chat"

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (conversation: ChatConversationItem) => void
}

type CreateGroupState = {
  groupName: string
  query: string
  users: ChatUserSearchResult[]
  selectedUsers: ChatUserSearchResult[]
  isLoadingUsers: boolean
  isSubmitting: boolean
}

type CreateGroupAction =
  | { type: "setGroupName"; groupName: string }
  | { type: "setQuery"; query: string }
  | { type: "setUsersLoading"; isLoadingUsers: boolean }
  | { type: "usersLoaded"; users: ChatUserSearchResult[] }
  | { type: "toggleUser"; user: ChatUserSearchResult }
  | { type: "removeUser"; userId: string }
  | { type: "setSubmitting"; isSubmitting: boolean }
  | { type: "reset" }

const initialCreateGroupState: CreateGroupState = {
  groupName: "",
  query: "",
  users: [],
  selectedUsers: [],
  isLoadingUsers: false,
  isSubmitting: false,
}

function createGroupReducer(
  state: CreateGroupState,
  action: CreateGroupAction,
): CreateGroupState {
  switch (action.type) {
    case "setGroupName":
      return { ...state, groupName: action.groupName }
    case "setQuery":
      return { ...state, query: action.query }
    case "setUsersLoading":
      return { ...state, isLoadingUsers: action.isLoadingUsers }
    case "usersLoaded":
      return { ...state, users: action.users, isLoadingUsers: false }
    case "toggleUser": {
      const selectedUsers = state.selectedUsers.some((item) => item.userId === action.user.userId)
        ? state.selectedUsers.filter((item) => item.userId !== action.user.userId)
        : [...state.selectedUsers, action.user]
      return { ...state, selectedUsers }
    }
    case "removeUser":
      return {
        ...state,
        selectedUsers: state.selectedUsers.filter((item) => item.userId !== action.userId),
      }
    case "setSubmitting":
      return { ...state, isSubmitting: action.isSubmitting }
    case "reset":
      return initialCreateGroupState
  }
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateGroupDialogProps) {
  const { toast } = useToast()
  const [state, dispatch] = useReducer(createGroupReducer, initialCreateGroupState)
  const { groupName, query, users, selectedUsers, isLoadingUsers, isSubmitting } = state

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
      dispatch({ type: "setUsersLoading", isLoadingUsers: true })
      const result = await searchChatUsers({ query, limit: 20 })
      if (!isDisposed) {
        dispatch({ type: "usersLoaded", users: result.success && result.data ? result.data : [] })
      }
    }, 200)

    return () => {
      isDisposed = true
      clearTimeout(timeoutId)
    }
  }, [open, query])

  const reset = () => {
    dispatch({ type: "reset" })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      reset()
    }
  }

  const toggleUser = (user: ChatUserSearchResult) => {
    dispatch({ type: "toggleUser", user })
  }

  const removeSelectedUser = (userId: string) => {
    dispatch({ type: "removeUser", userId })
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

    dispatch({ type: "setSubmitting", isSubmitting: true })
    const result = await createGroupConversation({
      name: groupName,
      participantIds: selectedUsers.map((user) => user.userId),
    })
    dispatch({ type: "setSubmitting", isSubmitting: false })

    if (!result.success || !result.data) {
      toast({
        title: "Không thể tạo nhóm",
        description: result.error ?? "Vui lòng thử lại.",
        variant: "destructive",
      })
      return
    }

    notifyContactGroupChanged({
      action: "group-created",
      conversationId: result.data.id,
    })
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
            onChange={(event) => dispatch({ type: "setGroupName", groupName: event.target.value })}
            placeholder="Tên nhóm"
            maxLength={80}
          />

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <Button
                  key={user.userId}
                  type="button"
                  variant="ghost"
                  className="h-auto gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 hover:text-primary"
                  onClick={() => removeSelectedUser(user.userId)}
                >
                  <span className="max-w-32 truncate">{user.displayName}</span>
                  <X className="size-3" />
                </Button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => dispatch({ type: "setQuery", query: event.target.value })}
              placeholder="Tìm thành viên"
              className="pl-8"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Đang tìm thành viên…
              </div>
            ) : users.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Không tìm thấy thành viên phù hợp.
              </p>
            ) : (
              users.map((user) => {
                const isSelected = selectedIds.has(user.userId)

                return (
                  <Button
                    key={user.userId}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-auto w-full justify-start gap-3 rounded-none px-3 py-2.5 text-left",
                      isSelected && "bg-primary/10",
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
                  </Button>
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
