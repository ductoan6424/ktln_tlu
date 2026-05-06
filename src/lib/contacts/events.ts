export const CONTACTS_CHANGED_EVENT = "uniconnect:contacts-changed"
export const CONTACTS_INBOX_EVENT = "contacts.changed"

export type ContactsChangedAction =
  | "followed"
  | "unfollowed"
  | "friendship-updated"
  | "message-sent"
  | "message-received"
  | "group-created"
  | "group-updated"
  | "group-left"
  | "group-deleted"

export type ContactsChangedDetail = {
  action: ContactsChangedAction
  userId?: string
  conversationId?: string
}

type ContactsChangedListener = (detail: ContactsChangedDetail) => void

export function notifyContactsChanged(detail: ContactsChangedDetail) {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent<ContactsChangedDetail>(CONTACTS_CHANGED_EVENT, { detail }),
  )
}

export function notifyContactFollowChanged(input: {
  userId: string
  isFollowing: boolean
  isMutual?: boolean
}) {
  notifyContactsChanged({
    action: input.isFollowing
      ? input.isMutual
        ? "friendship-updated"
        : "followed"
      : "unfollowed",
    userId: input.userId,
  })
}

export function notifyContactMessageChanged(input: {
  userId: string
  conversationId: string
  direction: "sent" | "received"
}) {
  notifyContactsChanged({
    action: input.direction === "received" ? "message-received" : "message-sent",
    userId: input.userId,
    conversationId: input.conversationId,
  })
}

export function notifyContactGroupChanged(input: {
  action: Extract<
    ContactsChangedAction,
    "group-created" | "group-updated" | "group-left" | "group-deleted" | "message-sent" | "message-received"
  >
  conversationId: string
}) {
  notifyContactsChanged({
    action: input.action,
    conversationId: input.conversationId,
  })
}

export function subscribeContactsChanged(listener: ContactsChangedListener) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const handleContactsChanged = (event: Event) => {
    listener((event as CustomEvent<ContactsChangedDetail>).detail)
  }

  window.addEventListener(CONTACTS_CHANGED_EVENT, handleContactsChanged)

  return () => {
    window.removeEventListener(CONTACTS_CHANGED_EVENT, handleContactsChanged)
  }
}
