export const CONTACTS_CHANGED_EVENT = "uniconnect:contacts-changed"

export type ContactsChangedAction = "followed" | "unfollowed"

export type ContactsChangedDetail = {
  action: ContactsChangedAction
  userId: string
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
