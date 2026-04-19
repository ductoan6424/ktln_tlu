import { afterEach, describe, expect, it, vi } from "vitest"
import {
  addToast,
  getToastSnapshot,
  resetToastStore,
  subscribeToToastStore,
} from "@/components/ui/use-toast"

afterEach(() => {
  resetToastStore()
  vi.restoreAllMocks()
})

describe("toast store", () => {
  it("shares one toast list across all subscribers", () => {
    const notificationsA: number[] = []
    const notificationsB: number[] = []
    const unsubscribeA = subscribeToToastStore(() => {
      notificationsA.push(getToastSnapshot().length)
    })
    const unsubscribeB = subscribeToToastStore(() => {
      notificationsB.push(getToastSnapshot().length)
    })
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(() => 0 as never)

    try {
      const id = addToast({ title: "Saved" })

      expect(id).toMatch(/^[a-z0-9]+$/)
      expect(getToastSnapshot()).toHaveLength(1)
      expect(getToastSnapshot()[0]).toMatchObject({
        id,
        title: "Saved",
        variant: "default",
      })
      expect(notificationsA).toEqual([1])
      expect(notificationsB).toEqual([1])
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribeA()
      unsubscribeB()
    }
  })
})
