"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react"

import {
  addGroupConversationMembers,
  deleteGroupConversation,
  getGroupConversationDetails,
  leaveGroupConversation,
  removeGroupConversationMember,
  renameGroupConversation,
  searchChatUsers,
} from "@/actions/chat"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { notifyContactGroupChanged } from "@/lib/contacts/events"
import { cn } from "@/lib/utils"
import type { ChatGroupDetails, ChatUserSearchResult } from "@/types/chat"

interface GroupInfoDialogProps {
  conversationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupRenamed?: (conversationId: string, name: string) => void
  onGroupMembersChanged?: (conversationId: string, participantCount: number) => void
  onLeftGroup?: (conversationId: string) => void
}

export function GroupInfoDialog({
  conversationId,
  open,
  onOpenChange,
  onGroupRenamed,
  onGroupMembersChanged,
  onLeftGroup,
}: GroupInfoDialogProps) {
  const { toast } = useToast()
  const [details, setDetails] = useState<ChatGroupDetails | null>(null)
  const [groupName, setGroupName] = useState("")
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [addMemberQuery, setAddMemberQuery] = useState("")
  const [users, setUsers] = useState<ChatUserSearchResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ChatUserSearchResult[]>([])
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false)
  const [areMembersVisible, setAreMembersVisible] = useState(true)
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isAddingMembers, setIsAddingMembers] = useState(false)
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)

  const selectedIds = useMemo(
    () => new Set(selectedUsers.map((user) => user.userId)),
    [selectedUsers],
  )
  const existingMemberIds = useMemo(
    () => new Set(details?.members.map((member) => member.userId) ?? []),
    [details],
  )
  const leader = useMemo(
    () => details?.members.find((member) => member.isAdmin) ?? null,
    [details],
  )
  const filteredMembers = useMemo(() => {
    const normalizedQuery = memberSearchQuery.trim().toLowerCase()

    if (!details) {
      return []
    }

    if (!normalizedQuery) {
      return details.members
    }

    return details.members.filter((member) =>
      member.displayName.toLowerCase().includes(normalizedQuery),
    )
  }, [details, memberSearchQuery])

  useEffect(() => {
    if (!open || !conversationId) {
      return
    }

    let isDisposed = false
    const loadDetails = async () => {
      if (isDisposed) {
        return
      }

      setIsLoading(true)
      const result = await getGroupConversationDetails({ conversationId })

      if (!isDisposed) {
        if (result.success && result.data) {
          setDetails(result.data)
          setGroupName(result.data.name)
        } else {
          setDetails(null)
          toast({
            title: "Không thể tải nhóm",
            description: result.error ?? "Vui lòng thử lại.",
            variant: "destructive",
          })
        }
        setIsLoading(false)
      }
    }

    void loadDetails()

    return () => {
      isDisposed = true
    }
  }, [conversationId, open, toast])

  useEffect(() => {
    if (!open || !isAddMembersOpen || !details?.currentUserIsAdmin) {
      return
    }

    let isDisposed = false
    const timeoutId = setTimeout(async () => {
      if (isDisposed) {
        return
      }

      setIsLoadingUsers(true)
      const result = await searchChatUsers({ query: addMemberQuery, limit: 20 })

      if (!isDisposed) {
        setUsers(result.success && result.data ? result.data : [])
        setIsLoadingUsers(false)
      }
    }, 200)

    return () => {
      isDisposed = true
      clearTimeout(timeoutId)
    }
  }, [addMemberQuery, details?.currentUserIsAdmin, isAddMembersOpen, open])

  const resetAddMembersState = () => {
    setAddMemberQuery("")
    setUsers([])
    setSelectedUsers([])
    setIsLoadingUsers(false)
    setIsAddingMembers(false)
  }

  const resetLocalState = () => {
    setDetails(null)
    setGroupName("")
    setMemberSearchQuery("")
    resetAddMembersState()
    setIsAddMembersOpen(false)
    setIsRenameOpen(false)
    setIsDeleteGroupOpen(false)
    setAreMembersVisible(true)
    setIsMemberSearchOpen(false)
    setIsLoading(false)
    setIsSavingName(false)
    setPendingMemberId(null)
    setIsLeaving(false)
    setIsDeletingGroup(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetLocalState()
    }
  }

  const handleAddMembersOpenChange = (nextOpen: boolean) => {
    setIsAddMembersOpen(nextOpen)
    if (!nextOpen) {
      resetAddMembersState()
    }
  }

  const handleRenameOpenChange = (nextOpen: boolean) => {
    setIsRenameOpen(nextOpen)
    if (nextOpen && details) {
      setGroupName(details.name)
    }
  }

  const toggleUser = (user: ChatUserSearchResult) => {
    if (existingMemberIds.has(user.userId)) {
      return
    }

    setSelectedUsers((prev) =>
      prev.some((item) => item.userId === user.userId)
        ? prev.filter((item) => item.userId !== user.userId)
        : [...prev, user],
    )
  }

  const getMemberSubtitle = (member: NonNullable<ChatGroupDetails["members"][number]>) => {
    if (member.isAdmin) {
      return "Người tạo nhóm"
    }

    if (!leader) {
      return "Thành viên"
    }

    return leader.userId === details?.currentUserId
      ? "Do bạn thêm"
      : `${leader.displayName} đã thêm`
  }

  const handleRename = async () => {
    if (!conversationId || !details) return

    setIsSavingName(true)
    const result = await renameGroupConversation({
      conversationId,
      name: groupName,
    })
    setIsSavingName(false)

    if (!result.success || !result.data) {
      toast({
        title: "Không thể đổi tên",
        description: result.error ?? "Vui lòng thử lại.",
        variant: "destructive",
      })
      return
    }

    const updatedName = result.data.name
    setDetails((prev) => (prev ? { ...prev, name: updatedName } : prev))
    notifyContactGroupChanged({
      action: "group-updated",
      conversationId,
    })
    onGroupRenamed?.(conversationId, result.data.name)
    setIsRenameOpen(false)
    toast({ description: "Đã đổi tên nhóm." })
  }

  const handleAddMembers = async () => {
    if (!conversationId || selectedUsers.length === 0) return

    setIsAddingMembers(true)
    const result = await addGroupConversationMembers({
      conversationId,
      participantIds: selectedUsers.map((user) => user.userId),
    })
    setIsAddingMembers(false)

    if (!result.success || !result.data) {
      toast({
        title: "Không thể thêm thành viên",
        description: result.error ?? "Vui lòng thử lại.",
        variant: "destructive",
      })
      return
    }

    setDetails(result.data)
    notifyContactGroupChanged({
      action: "group-updated",
      conversationId,
    })
    onGroupMembersChanged?.(conversationId, result.data.participantCount)
    handleAddMembersOpenChange(false)
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!conversationId || !details) return

    setPendingMemberId(memberId)
    const result = await removeGroupConversationMember({
      conversationId,
      memberId,
    })
    setPendingMemberId(null)

    if (!result.success || !result.data) {
      toast({
        title: "Không thể xoá thành viên",
        description: result.error ?? "Vui lòng thử lại.",
        variant: "destructive",
      })
      return
    }

    setDetails(result.data)
    notifyContactGroupChanged({
      action: "group-updated",
      conversationId,
    })
    onGroupMembersChanged?.(conversationId, result.data.participantCount)
  }

  const handleLeaveGroup = async () => {
    if (!conversationId) return

    setIsLeaving(true)
    const result = await leaveGroupConversation({ conversationId })
    setIsLeaving(false)

    if (!result.success || !result.data) {
      toast({
        title: "Không thể rời nhóm",
        description: result.error ?? "Vui lòng thử lại.",
        variant: "destructive",
      })
      return
    }

    notifyContactGroupChanged({
      action: "group-left",
      conversationId,
    })
    onLeftGroup?.(conversationId)
    handleOpenChange(false)
  }

  const handleDeleteGroup = async () => {
    if (!conversationId) return

    setIsDeletingGroup(true)
    const result = await deleteGroupConversation({ conversationId })
    setIsDeletingGroup(false)

    if (!result.success || !result.data) {
      toast({
        title: "Không thể xoá nhóm",
        description: result.error ?? "Vui lòng thử lại.",
        variant: "destructive",
      })
      return
    }

    notifyContactGroupChanged({
      action: "group-deleted",
      conversationId,
    })
    onLeftGroup?.(conversationId)
    handleOpenChange(false)
  }

  const availableUsers = users.filter((user) => !existingMemberIds.has(user.userId))

  if (!open || !conversationId) {
    return null
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="fixed inset-0 z-40 size-auto rounded-none bg-background/60 p-0 backdrop-blur-sm hover:bg-background/60 lg:hidden"
        aria-label="Đóng thông tin nhóm"
        onClick={() => handleOpenChange(false)}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl lg:static lg:z-auto lg:h-full lg:w-80 lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-[360px]">
        <header className="flex h-16 shrink-0 items-start justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{details?.name ?? "Nhóm chat"}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {details ? `${details.participantCount} thành viên` : "Đang tải thông tin"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Đóng thông tin nhóm"
            onClick={() => handleOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </header>

        {isLoading || !details ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang tải thông tin nhóm…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {details.currentUserIsAdmin && (
              <Button
                type="button"
                variant="ghost"
                className="mb-4 h-12 w-full justify-start gap-4 px-2 text-left hover:bg-muted/70"
                onClick={() => handleRenameOpenChange(true)}
              >
                <Pencil className="size-5 text-foreground" />
                <span className="text-[15px] font-semibold">Đổi tên nhóm</span>
              </Button>
            )}

            <section className="space-y-1">
              <div className="flex h-9 items-center justify-between px-2">
                <h3 className="text-base font-semibold">Thành viên trong đoạn chat</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={isMemberSearchOpen ? "Đóng tìm kiếm thành viên" : "Tìm thành viên"}
                    onClick={() => {
                      setIsMemberSearchOpen((isOpen) => !isOpen)
                      setAreMembersVisible(true)
                      if (isMemberSearchOpen) {
                        setMemberSearchQuery("")
                      }
                    }}
                  >
                    <Search className="size-4 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={areMembersVisible ? "Ẩn thành viên" : "Hiện thành viên"}
                    onClick={() => setAreMembersVisible((visible) => !visible)}
                  >
                    {areMembersVisible ? (
                      <ChevronUp className="size-4 text-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {areMembersVisible && isMemberSearchOpen && (
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={memberSearchQuery}
                      onChange={(event) => setMemberSearchQuery(event.target.value)}
                      placeholder="Tìm trong nhóm"
                      className="pl-8"
                    />
                  </div>
                </div>
              )}

              {areMembersVisible && filteredMembers.map((member) => {
                const canRemove =
                  details.currentUserIsAdmin &&
                  member.userId !== details.currentUserId &&
                  !member.isAdmin

                return (
                  <div key={member.userId} className="flex min-h-16 items-center gap-3 rounded-lg p-2 hover:bg-muted/70">
                    <UserAvatar
                      src={member.avatarUrl ?? undefined}
                      name={member.displayName}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold leading-5">{member.displayName}</p>
                      <p className="truncate text-sm leading-5 text-muted-foreground">
                        {getMemberSubtitle(member)}
                      </p>
                    </div>
                    {canRemove && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Tùy chọn cho ${member.displayName}`}
                              disabled={pendingMemberId === member.userId}
                            />
                          }
                        >
                          {pendingMemberId === member.userId ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="size-5" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="bottom" className="w-40">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              void handleRemoveMember(member.userId)
                            }}
                          >
                            <Trash2 className="size-4" />
                            Xóa khỏi nhóm
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}

              {areMembersVisible && filteredMembers.length === 0 && (
                <p className="px-2 py-4 text-sm text-muted-foreground">Không tìm thấy thành viên phù hợp.</p>
              )}

              {details.currentUserIsAdmin && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-14 w-full justify-start gap-4 px-2 text-left hover:bg-muted/70"
                  onClick={() => handleAddMembersOpenChange(true)}
                >
                  <UserPlus className="size-6 text-foreground" />
                  <span className="text-[15px] font-semibold">Thêm người</span>
                </Button>
              )}
            </section>
          </div>
        )}

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">
          {details?.currentUserIsAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteGroupOpen(true)}
              disabled={isDeletingGroup}
            >
              <Trash2 className="size-3.5" />
              Xóa nhóm
            </Button>
          )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLeaveGroup}
              disabled={isLeaving || !details}
            >
              {isLeaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Đang rời
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogOut className="size-4" />
                  Rời nhóm
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Đóng
            </Button>
        </footer>
      </aside>

      <Dialog open={isRenameOpen} onOpenChange={handleRenameOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi tên nhóm</DialogTitle>
          </DialogHeader>
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            maxLength={80}
            placeholder="Tên nhóm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameOpenChange(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleRename}
              disabled={isSavingName || !groupName.trim() || groupName.trim() === details?.name}
            >
              {isSavingName ? <Loader2 className="size-4 animate-spin" /> : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMembersOpen} onOpenChange={handleAddMembersOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-4">
            <DialogTitle>Thêm người</DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-4 space-y-3">
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Button
                    key={user.userId}
                    type="button"
                    variant="ghost"
                    className="h-auto gap-1.5 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 hover:text-primary"
                    onClick={() => setSelectedUsers((prev) => prev.filter((item) => item.userId !== user.userId))}
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
                value={addMemberQuery}
                onChange={(event) => setAddMemberQuery(event.target.value)}
                placeholder="Tìm thành viên"
                className="pl-8"
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              {isLoadingUsers ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Đang tìm…
                </div>
              ) : availableUsers.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  Không có thành viên phù hợp.
                </p>
              ) : (
                availableUsers.map((user) => {
                  const isSelected = selectedIds.has(user.userId)

                  return (
                    <Button
                      key={user.userId}
                      type="button"
                      variant="ghost"
                      className={cn(
                        "h-auto w-full justify-start gap-3 rounded-none px-3 py-2.5 text-left",
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
                    </Button>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter className="px-5">
            <Button variant="outline" onClick={() => handleAddMembersOpenChange(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={isAddingMembers || selectedUsers.length === 0}
            >
              {isAddingMembers ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Đang thêm
                </span>
              ) : (
                "Thêm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteGroupOpen} onOpenChange={setIsDeleteGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa nhóm</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hành động này sẽ xóa nhóm, thành viên và toàn bộ tin nhắn trong nhóm. Không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteGroupOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={isDeletingGroup}
            >
              {isDeletingGroup ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Đang xóa
                </span>
              ) : (
                "Xóa nhóm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
