import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CONTACTS_CHANGED_EVENT,
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
})
