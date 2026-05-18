"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { MoreHorizontal, Plus, Search, UsersRound, X } from "lucide-react"

import { getChatSessionUser } from "@/actions/chat"
import { listActiveFriends } from "@/actions/users"
import type { ContactGroup } from "@/actions/users"
import { CreateGroupDialog } from "@/components/messages/create-group-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useChatRealtime } from "@/hooks/use-chat-realtime"
import { createAblyClient } from "@/lib/ably/client"
import { getUserInboxChannelName } from "@/lib/config/chat"
import {
  CONTACTS_INBOX_EVENT,
  notifyContactMessageChanged,
  notifyContactsChanged,
  subscribeContactsChanged,
} from "@/lib/contacts/events"
import { cn } from "@/lib/utils"
import type { ChatSessionUser } from "@/types/chat"
import type { ActiveFriend } from "./mock-data"

interface ActiveFriendsProps {
  onFriendClick?: (friend: ActiveFriend) => void
  className?: string
}

const CONTACTS_TOTAL_LIMIT = 20
const SOURCE_RANK: Record<NonNullable<ActiveFriend["source"]>, number> = {
  friend: 0,
  conversation: 1,
  follow: 2,
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN")
}

export function ActiveFriends({ onFriendClick, className }: ActiveFriendsProps) {
  const [sessionUser, setSessionUser] = useState<ChatSessionUser | null>(null)
  const [contacts, setContacts] = useState<ActiveFriend[]>([])
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [searchContacts, setSearchContacts] = useState<ActiveFriend[] | null>(null)
  const [searchGroups, setSearchGroups] = useState<ContactGroup[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [query, setQuery] = useState("")
  const normalizedQuery = normalizeSearch(query)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { onlineUserIds } = useChatRealtime({
    currentUser: sessionUser,
    conversationId: null,
  })

  useEffect(() => {
    const fetchContacts = async () => {
      const [sessionResult, contactsResult] = await Promise.all([
        getChatSessionUser(),
        listActiveFriends(),
      ])

      if (sessionResult.success && sessionResult.data) {
        setSessionUser(sessionResult.data)
      }

      if (!contactsResult.success || !contactsResult.data) {
        setContacts([])
        setGroups([])
        setIsLoading(false)
        return
      }

      setContacts(contactsResult.data.contacts)
      setGroups(contactsResult.data.groups)
      setIsLoading(false)
    }

    void fetchContacts()
  }, [])

  useEffect(() => {
    let isDisposed = false

    const refreshContacts = async () => {
      if (isDisposed) {
        return
      }

      const result = await listActiveFriends(normalizedQuery ? { query } : undefined)

      if (!isDisposed) {
        if (!result.success || !result.data) {
          if (normalizedQuery) {
            setSearchContacts([])
            setSearchGroups([])
          } else {
            setContacts([])
            setGroups([])
          }
        } else {
          if (normalizedQuery) {
            setSearchContacts(result.data.contacts)
            setSearchGroups(result.data.groups)
          } else {
            setContacts(result.data.contacts)
            setGroups(result.data.groups)
          }
        }
      }
    }

    const unsubscribe = subscribeContactsChanged(() => {
      void refreshContacts()
    })

    return () => {
      isDisposed = true
      unsubscribe()
    }
  }, [normalizedQuery, query])

  useEffect(() => {
    if (!sessionUser) {
      return
    }

    const client = createAblyClient()
    const inboxChannel = client.channels.get(getUserInboxChannelName(sessionUser.userId))
    const handleContactsChanged = (message: { data?: unknown }) => {
      const payload = message.data as Parameters<typeof notifyContactsChanged>[0] | undefined

      if (!payload || typeof payload.action !== "string") {
        return
      }

      notifyContactsChanged(payload)
    }
    const handleIncomingMessage = (message: { data?: unknown }) => {
      const payload = message.data as {
        conversationId?: unknown
        senderId?: unknown
      } | undefined

      if (
        !payload ||
        typeof payload.senderId !== "string" ||
        typeof payload.conversationId !== "string"
      ) {
        return
      }

      notifyContactMessageChanged({
        userId: payload.senderId,
        conversationId: payload.conversationId,
        direction: "received",
      })
    }

    inboxChannel.subscribe(CONTACTS_INBOX_EVENT, handleContactsChanged)
    inboxChannel.subscribe("chat.incoming", handleIncomingMessage)

    return () => {
      inboxChannel.unsubscribe(CONTACTS_INBOX_EVENT, handleContactsChanged)
      inboxChannel.unsubscribe("chat.incoming", handleIncomingMessage)
    }
  }, [sessionUser])

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    }
  }, [isSearchOpen])

  useEffect(() => {
    if (!normalizedQuery) {
      return
    }

    let isDisposed = false
    const timeoutId = setTimeout(async () => {
      if (isDisposed) {
        return
      }

      setIsSearching(true)
      const result = await listActiveFriends({ query })

      if (!isDisposed) {
        if (result.success && result.data) {
          setSearchContacts(result.data.contacts)
          setSearchGroups(result.data.groups)
        } else {
          setSearchContacts([])
          setSearchGroups([])
        }
        setIsSearching(false)
      }
    }, 250)

    return () => {
      isDisposed = true
      clearTimeout(timeoutId)
    }
  }, [normalizedQuery, query])

  const activeContacts = useMemo(
    () => (normalizedQuery ? searchContacts ?? [] : contacts),
    [contacts, normalizedQuery, searchContacts],
  )
  const activeGroups = useMemo(
    () => (normalizedQuery ? searchGroups ?? [] : groups),
    [groups, normalizedQuery, searchGroups],
  )

  const sortedContacts = useMemo(() => {
    return activeContacts
      .map((contact) => ({
        ...contact,
        status: onlineUserIds.has(contact.id)
          ? ("online" as const)
          : ("offline" as const),
      }))
      .sort((a, b) => {
        const aOnlineRank = a.status === "online" ? 0 : 1
        const bOnlineRank = b.status === "online" ? 0 : 1
        if (aOnlineRank !== bOnlineRank) return aOnlineRank - bOnlineRank

        const aSourceRank = a.source ? SOURCE_RANK[a.source] : 3
        const bSourceRank = b.source ? SOURCE_RANK[b.source] : 3
        if (aSourceRank !== bSourceRank) return aSourceRank - bSourceRank

        return (a.sourceIndex ?? 0) - (b.sourceIndex ?? 0)
      })
  }, [activeContacts, onlineUserIds])

  const visibleContacts = useMemo(() => {
    return normalizedQuery
      ? sortedContacts
      : sortedContacts.slice(0, CONTACTS_TOTAL_LIMIT)
  }, [normalizedQuery, sortedContacts])

  const visibleGroups = useMemo(() => {
    return activeGroups
  }, [activeGroups])

  const hasNoResults =
    !isLoading &&
    !isSearching &&
    visibleContacts.length === 0 &&
    visibleGroups.length === 0

  const closeSearch = () => {
    setQuery("")
    setSearchContacts(null)
    setSearchGroups(null)
    setIsSearching(false)
    setIsSearchOpen(false)
  }

  return (
    <>
      <CreateGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        onCreated={(conversation) => {
          setGroups((prev) => [
            {
              id: conversation.id,
              name: conversation.name,
              participantCount: conversation.participantCount,
              lastMessage: conversation.lastMessage,
              lastMessageAt: conversation.lastMessageAt,
              unreadCount: conversation.unreadCount,
            },
            ...prev.filter((group) => group.id !== conversation.id),
          ])
        }}
      />

      <Card className={cn("border-none bg-transparent shadow-none", className)}>
        <CardContent className="p-0">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-base font-bold text-muted-foreground">Người liên hệ</p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground"
              aria-label="Tìm liên hệ"
              onClick={() => setIsSearchOpen((open) => !open)}
            >
              <Search className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground"
              aria-label="Tùy chọn liên hệ"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </div>

        {isSearchOpen && (
          <div className="mb-2 flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm"
              className="h-6 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {(query || isSearchOpen) && (
              <button
                type="button"
                className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label="Đóng tìm kiếm"
                onClick={closeSearch}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="space-y-0.5">
          {normalizedQuery && isSearching && (
            <p className="p-2 text-sm text-muted-foreground">Đang tìm kiếm…</p>
          )}
          {visibleContacts.map((contact) => (
            <Button
              key={contact.id}
              variant="ghost"
              className="h-11 w-full justify-start gap-3 rounded-md px-2 text-left"
              onClick={() => onFriendClick?.(contact)}
            >
              <UserAvatar
                src={contact.avatar}
                name={contact.name}
                size="md"
                showStatus={contact.status === "online"}
                status={contact.status}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {contact.name}
              </span>
            </Button>
          ))}
        </div>

        {(visibleGroups.length > 0 || !normalizedQuery) && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 px-1 text-base font-bold text-muted-foreground">Nhóm chat</p>
            <div className="space-y-0.5">
              {visibleGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/messages?conversation=${group.id}`}
                  className="flex h-11 items-center gap-3 rounded-md px-2 text-sm font-semibold hover:bg-muted"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UsersRound className="size-5" />
                  </div>
                  <span className="min-w-0 flex-1 truncate">{group.name}</span>
                  {group.unreadCount > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {group.unreadCount > 9 ? "9+" : group.unreadCount}
                    </span>
                  )}
                </Link>
              ))}

              {!normalizedQuery && (
                <button
                  type="button"
                  className="flex h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm font-semibold hover:bg-muted"
                  onClick={() => setIsCreateGroupOpen(true)}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                    <Plus className="size-5" />
                  </div>
                  <span>Tạo nhóm chat</span>
                </button>
              )}
            </div>
          </div>
        )}

        {hasNoResults && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Không tìm thấy liên hệ phù hợp.
          </p>
        )}
        </CardContent>
      </Card>
    </>
  )
}
