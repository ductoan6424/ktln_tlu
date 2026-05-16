import { describe, it, expect } from "vitest"

import { computePollView } from "@/lib/polls/queries"

// Hàm hỗ trợ tạo data raw giả lập cho test
function buildPoll(overrides: Partial<Parameters<typeof computePollView>[0]> = {}) {
  return {
    id: "poll-1",
    postId: "post-1",
    question: "Bạn thích gì?",
    type: "SINGLE" as const,
    closedAt: null,
    closedEarly: false,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    options: [
      {
        id: "opt-a",
        content: "A",
        position: 0,
        votes: [{ userId: "user-1" }, { userId: "user-2" }],
      },
      {
        id: "opt-b",
        content: "B",
        position: 1,
        votes: [{ userId: "user-3" }],
      },
    ],
    ...overrides,
  }
}

describe("computePollView", () => {
  it("tính đúng tổng lượt vote và tổng voter duy nhất", () => {
    const view = computePollView(buildPoll(), null)
    expect(view.totalVotes).toBe(3)
    expect(view.totalVoters).toBe(3)
  })

  it("tính % theo tổng lượt vote, làm tròn 1 chữ số thập phân", () => {
    const view = computePollView(buildPoll(), null)
    // 2/3 ≈ 66.7%, 1/3 ≈ 33.3%
    expect(view.options[0]?.percentage).toBeCloseTo(66.7, 1)
    expect(view.options[1]?.percentage).toBeCloseTo(33.3, 1)
  })

  it("trả về 0% khi chưa có vote nào", () => {
    const view = computePollView(
      buildPoll({
        options: [
          { id: "opt-a", content: "A", position: 0, votes: [] },
          { id: "opt-b", content: "B", position: 1, votes: [] },
        ],
      }),
      null,
    )
    expect(view.totalVotes).toBe(0)
    expect(view.options[0]?.percentage).toBe(0)
  })

  it("đánh dấu myOptionIds khi có currentUserId đã vote", () => {
    const view = computePollView(buildPoll(), "user-1")
    expect(view.myOptionIds).toEqual(["opt-a"])
    expect(view.options[0]?.isVotedByMe).toBe(true)
    expect(view.options[1]?.isVotedByMe).toBe(false)
  })

  it("không đánh dấu khi currentUserId là null", () => {
    const view = computePollView(buildPoll(), null)
    expect(view.myOptionIds).toEqual([])
    expect(view.options.every((opt) => !opt.isVotedByMe)).toBe(true)
  })

  it("MULTIPLE: totalVoters khác totalVotes khi 1 user vote nhiều option", () => {
    const view = computePollView(
      buildPoll({
        type: "MULTIPLE",
        options: [
          {
            id: "opt-a",
            content: "A",
            position: 0,
            votes: [{ userId: "user-1" }, { userId: "user-2" }],
          },
          {
            id: "opt-b",
            content: "B",
            position: 1,
            votes: [{ userId: "user-1" }], // user-1 vote cả 2
          },
        ],
      }),
      null,
    )
    expect(view.totalVotes).toBe(3)
    expect(view.totalVoters).toBe(2)
  })

  it("isClosed = true khi closedAt đã qua", () => {
    const past = new Date(Date.now() - 10_000)
    const view = computePollView(buildPoll({ closedAt: past }), "user-1")
    expect(view.isClosed).toBe(true)
    expect(view.canVote).toBe(false)
  })

  it("canVote = true khi có currentUserId và chưa đóng", () => {
    const future = new Date(Date.now() + 60_000)
    const view = computePollView(buildPoll({ closedAt: future }), "user-99")
    expect(view.isClosed).toBe(false)
    expect(view.canVote).toBe(true)
  })

  it("canVote = false khi không có currentUserId", () => {
    const view = computePollView(buildPoll(), null)
    expect(view.canVote).toBe(false)
  })

  it("sắp xếp options theo position tăng dần", () => {
    const view = computePollView(
      buildPoll({
        options: [
          { id: "opt-b", content: "B", position: 1, votes: [] },
          { id: "opt-a", content: "A", position: 0, votes: [] },
        ],
      }),
      null,
    )
    expect(view.options.map((o) => o.id)).toEqual(["opt-a", "opt-b"])
  })
})
