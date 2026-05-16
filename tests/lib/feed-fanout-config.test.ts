import { beforeEach, describe, expect, it, vi } from "vitest"

const redis = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock("@/lib/redis/client", () => ({ redis }))

import {
  DEFAULT_FEED_FANOUT_CONFIG,
  FEED_FANOUT_CONFIG_REDIS_KEY,
} from "@/lib/config/posts"
import { getFeedFanoutConfig } from "@/lib/feed/config"

beforeEach(() => {
  redis.get.mockReset()
})

describe("getFeedFanoutConfig", () => {
  it("trả về default khi Redis không có override", async () => {
    redis.get.mockResolvedValue(null)

    const config = await getFeedFanoutConfig()

    expect(redis.get).toHaveBeenCalledWith(FEED_FANOUT_CONFIG_REDIS_KEY)
    expect(config).toEqual(DEFAULT_FEED_FANOUT_CONFIG)
  })

  it("merge override hợp lệ từ Redis", async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      followerThreshold: 250,
      freshnessOverlayRatio: 0.25,
      freshnessWindowMinutes: 45,
    }))

    const config = await getFeedFanoutConfig()

    expect(config).toEqual({
      ...DEFAULT_FEED_FANOUT_CONFIG,
      followerThreshold: 250,
      freshnessOverlayRatio: 0.25,
      freshnessWindowMinutes: 45,
    })
  })

  it("dùng default khi Redis lỗi", async () => {
    redis.get.mockRejectedValue(new Error("redis down"))

    const config = await getFeedFanoutConfig()

    expect(config).toEqual(DEFAULT_FEED_FANOUT_CONFIG)
  })

  it("dùng default khi JSON invalid", async () => {
    redis.get.mockResolvedValue("{bad json")

    const config = await getFeedFanoutConfig()

    expect(config).toEqual(DEFAULT_FEED_FANOUT_CONFIG)
  })

  it("dùng default khi override sai schema", async () => {
    redis.get.mockResolvedValue(JSON.stringify({
      followerThreshold: -1,
      freshnessOverlayRatio: 2,
    }))

    const config = await getFeedFanoutConfig()

    expect(config).toEqual(DEFAULT_FEED_FANOUT_CONFIG)
  })
})
