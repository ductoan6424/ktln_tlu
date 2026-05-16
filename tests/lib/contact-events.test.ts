import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CONTACTS_CHANGED_EVENT,
  CONTACTS_INBOX_EVENT,
  notifyContactFollowChanged,
  notifyContactGroupChanged,
  notifyContactMessageChanged,
  notifyContactsChanged,
  subscribeContactsChanged,
} from "@/lib/contacts/events"

type WindowEvent = {
  type: string
  detail?: unknown
}

type WindowListener = (event: WindowEvent) => void

function installWindowStub() {
  const listeners = new Map<string, Set<WindowListener>>()

  vi.stubGlobal("CustomEvent", class {
    type: string
    detail: unknown

    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type
      this.detail = init?.detail
    }
  })

  vi.stubGlobal("window", {
    addEventListener: vi.fn((type: string, listener: WindowListener) => {
      const eventListeners = listeners.get(type) ?? new Set<WindowListener>()
      eventListeners.add(listener)
      listeners.set(type, eventListeners)
    }),
    removeEventListener: vi.fn((type: string, listener: WindowListener) => {
      listeners.get(type)?.delete(listener)
    }),
    dispatchEvent: vi.fn((event: WindowEvent) => {
      listeners.get(event.type)?.forEach((listener) => listener(event))
      return true
    }),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("contact events", () => {
  it("notifies subscribers when contacts change", () => {
    installWindowStub()
    const listener = vi.fn()

    const unsubscribe = subscribeContactsChanged(listener)
    notifyContactsChanged({ action: "followed", userId: "user-2" })

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: CONTACTS_CHANGED_EVENT }),
    )
    expect(listener).toHaveBeenCalledWith({ action: "followed", userId: "user-2" })

    unsubscribe()
    notifyContactsChanged({ action: "unfollowed", userId: "user-2" })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("is a no-op outside the browser", () => {
    expect(() => notifyContactsChanged({ action: "followed", userId: "user-2" })).not.toThrow()
    expect(() => subscribeContactsChanged(() => undefined)()).not.toThrow()
  })

  it("emits semantic events for friendship and messages", () => {
    installWindowStub()
    const listener = vi.fn()

    subscribeContactsChanged(listener)

    notifyContactFollowChanged({
      userId: "user-2",
      isFollowing: true,
      isMutual: true,
    })
    notifyContactMessageChanged({
      userId: "user-3",
      conversationId: "conversation-1",
      direction: "received",
    })

    expect(listener).toHaveBeenNthCalledWith(1, {
      action: "friendship-updated",
      userId: "user-2",
    })
    expect(listener).toHaveBeenNthCalledWith(2, {
      action: "message-received",
      userId: "user-3",
      conversationId: "conversation-1",
    })
  })

  it("emits semantic events for group chat changes", () => {
    installWindowStub()
    const listener = vi.fn()

    subscribeContactsChanged(listener)

    notifyContactGroupChanged({
      action: "group-deleted",
      conversationId: "group-1",
    })

    expect(listener).toHaveBeenCalledWith({
      action: "group-deleted",
      conversationId: "group-1",
    })
    expect(CONTACTS_INBOX_EVENT).toBe("contacts.changed")
  })
})
