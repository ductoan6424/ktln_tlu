"use client"

import Link from "next/link"
import { useEffect, useMemo, useReducer, useRef } from "react"
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

type ActiveFriendsState = {
  sessionUser: ChatSessionUser | null
  contacts: ActiveFriend[]
  groups: ContactGroup[]
  searchContacts: ActiveFriend[] | null
  searchGroups: ContactGroup[] | null
  isLoading: boolean
  isSearching: boolean
  isSearchOpen: boolean
  isCreateGroupOpen: boolean
  hasOpenedCreateGroup: boolean
  query: string
}

type ActiveFriendsAction =
  | {
      type: "loaded"
      sessionUser: ChatSessionUser | null
      contacts: ActiveFriend[]
      groups: ContactGroup[]
    }
  | { type: "contactsLoaded"; contacts: ActiveFriend[]; groups: ContactGroup[]; isSearch: boolean }
  | { type: "setSearching"; isSearching: boolean }
  | { type: "setSearchOpen"; isSearchOpen: boolean }
  | { type: "setCreateGroupOpen"; isCreateGroupOpen: boolean }
  | { type: "setQuery"; query: string }
  | { type: "closeSearch" }
  | { type: "groupCreated"; group: ContactGroup }

const initialActiveFriendsState: ActiveFriendsState = {
  sessionUser: null,
  contacts: [],
  groups: [],
  searchContacts: null,
  searchGroups: null,
  isLoading: true,
  isSearching: false,
  isSearchOpen: false,
  isCreateGroupOpen: false,
  hasOpenedCreateGroup: false,
  query: "",
}

function activeFriendsReducer(
  state: ActiveFriendsState,
  action: ActiveFriendsAction,
): ActiveFriendsState {
  switch (action.type) {
    case "loaded":
      return {
        ...state,
        sessionUser: action.sessionUser,
        contacts: action.contacts,
        groups: action.groups,
        isLoading: false,
      }
    case "contactsLoaded":
      return action.isSearch
        ? {
            ...state,
            searchContacts: action.contacts,
            searchGroups: action.groups,
            isSearching: false,
          }
        : {
            ...state,
            contacts: action.contacts,
            groups: action.groups,
            isLoading: false,
          }
    case "setSearching":
      return { ...state, isSearching: action.isSearching }
    case "setSearchOpen":
      return { ...state, isSearchOpen: action.isSearchOpen }
    case "setCreateGroupOpen":
      return {
        ...state,
        isCreateGroupOpen: action.isCreateGroupOpen,
        hasOpenedCreateGroup:
          state.hasOpenedCreateGroup || action.isCreateGroupOpen,
      }
    case "setQuery":
      return { ...state, query: action.query }
    case "closeSearch":
      return {
        ...state,
        query: "",
        searchContacts: null,
        searchGroups: null,
        isSearching: false,
        isSearchOpen: false,
      }
    case "groupCreated":
      return {
        ...state,
        groups: [action.group, ...state.groups.filter((group) => group.id !== action.group.id)],
      }
  }
}

export function ActiveFriends({ onFriendClick, className }: ActiveFriendsProps) {
  const [state, dispatch] = useReducer(activeFriendsReducer, initialActiveFriendsState)
  const {
    sessionUser,
    contacts,
    groups,
    searchContacts,
    searchGroups,
    isLoading,
    isSearching,
    isSearchOpen,
    isCreateGroupOpen,
    hasOpenedCreateGroup,
    query,
  } = state
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

      dispatch({
        type: "loaded",
        sessionUser: sessionResult.success && sessionResult.data ? sessionResult.data : null,
        contacts: contactsResult.success && contactsResult.data ? contactsResult.data.contacts : [],
        groups: contactsResult.success && contactsResult.data ? contactsResult.data.groups : [],
      })
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
          dispatch({ type: "contactsLoaded", contacts: [], groups: [], isSearch: Boolean(normalizedQuery) })
        } else {
          dispatch({
            type: "contactsLoaded",
            contacts: result.data.contacts,
            groups: result.data.groups,
            isSearch: Boolean(normalizedQuery),
          })
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

      dispatch({ type: "setSearching", isSearching: true })
      const result = await listActiveFriends({ query })

      if (!isDisposed) {
        if (result.success && result.data) {
          dispatch({
            type: "contactsLoaded",
            contacts: result.data.contacts,
            groups: result.data.groups,
            isSearch: true,
          })
        } else {
          dispatch({ type: "contactsLoaded", contacts: [], groups: [], isSearch: true })
        }
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
    dispatch({ type: "closeSearch" })
  }

  return (
    <>
      {/* Lazy mount: chỉ render sau lần mở đầu tiên; giữ mount cho animation đóng */}
      {hasOpenedCreateGroup && (
        <CreateGroupDialog
          open={isCreateGroupOpen}
          onOpenChange={(isCreateGroupOpen) => dispatch({ type: "setCreateGroupOpen", isCreateGroupOpen })}
          onCreated={(conversation) => {
            dispatch({
              type: "groupCreated",
              group: {
                id: conversation.id,
                name: conversation.name,
                participantCount: conversation.participantCount,
                lastMessage: conversation.lastMessage,
                lastMessageAt: conversation.lastMessageAt,
                unreadCount: conversation.unreadCount,
              },
            })
          }}
        />
      )}

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
              onClick={() => dispatch({ type: "setSearchOpen", isSearchOpen: !isSearchOpen })}
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
              onChange={(event) => dispatch({ type: "setQuery", query: event.target.value })}
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
                  onClick={() => dispatch({ type: "setCreateGroupOpen", isCreateGroupOpen: true })}
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
