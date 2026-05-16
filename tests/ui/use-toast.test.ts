import { afterEach, describe, expect, it, vi } from "vitest"
import {
  __resetToastStore,
  getToasts,
  subscribe,
  toast,
} from "@/components/ui/use-toast"

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  __resetToastStore()
})

describe("toast store", () => {
  it("shares a single toast list across subscribers", () => {
    vi.useFakeTimers()

    const observedCounts: number[] = []
    const unsubscribe = subscribe(() => {
      observedCounts.push(getToasts().length)
    })

    toast({ title: "Ảnh đại diện đã được cập nhật" })

    expect(getToasts()).toHaveLength(1)
    expect(observedCounts).toEqual([1])

    unsubscribe()
  })

  it("removes a toast after the timeout expires", () => {
    vi.useFakeTimers()

    toast({ title: "Tạm thời" })
    expect(getToasts()).toHaveLength(1)

    vi.advanceTimersByTime(5000)

    expect(getToasts()).toHaveLength(0)
  })
})
