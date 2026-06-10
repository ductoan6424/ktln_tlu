import { afterEach, describe, expect, it, vi } from "vitest"
import {
  addToast,
  getToastSnapshot,
  resetToastStore,
  subscribeToToastStore,
} from "@/components/ui/use-toast"

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  resetToastStore()
})

describe("toast store", () => {
  it("shares a single toast list across subscribers", () => {
    vi.useFakeTimers()

    const observedCounts: number[] = []
    const unsubscribe = subscribeToToastStore(() => {
      observedCounts.push(getToastSnapshot().length)
    })

    addToast({ title: "Ảnh đại diện đã được cập nhật" })

    expect(getToastSnapshot()).toHaveLength(1)
    expect(observedCounts).toEqual([1])

    unsubscribe()
  })

  it("removes a toast after the timeout expires", () => {
    vi.useFakeTimers()

    addToast({ title: "Tạm thời" })
    expect(getToastSnapshot()).toHaveLength(1)

    vi.advanceTimersByTime(5000)

    expect(getToastSnapshot()).toHaveLength(0)
  })
})
