import { describe, it, expect } from "vitest"

import {
  buildGroupKey,
  buildInitialAggregateMetadata,
  buildNotificationLink,
  mergeAggregateMetadata,
  renderNotification,
} from "@/lib/notifications/formatters"

describe("buildGroupKey", () => {
  it("tạo key cho FOLLOW giữa hai user", () => {
    expect(
      buildGroupKey({ type: "FOLLOW", actorId: "u1", recipientId: "u2" }),
    ).toBe("FOLLOW:u1:u2")
  })

  it("tạo key cho FRIENDSHIP giữa hai user", () => {
    expect(
      buildGroupKey({ type: "FRIENDSHIP", actorId: "u1", recipientId: "u2" }),
    ).toBe("FRIENDSHIP:u1:u2")
  })

  it("tạo key cho COMMENT theo post", () => {
    expect(buildGroupKey({ type: "COMMENT", postId: "p1" })).toBe("COMMENT:p1")
  })

  it("tạo key cho COMMENT_REPLY theo parent comment", () => {
    expect(
      buildGroupKey({ type: "COMMENT_REPLY", parentCommentId: "c1" }),
    ).toBe("COMMENT_REPLY:c1")
  })

  it("tạo key cho REPOST theo post", () => {
    expect(buildGroupKey({ type: "REPOST", postId: "p1" })).toBe("REPOST:p1")
  })

  it("tạo key cho LIKE theo post", () => {
    expect(buildGroupKey({ type: "LIKE", postId: "p1" })).toBe("LIKE:p1")
  })

  it("tạo key cho POLL_VOTE theo poll (aggregate chung cho tất cả voters)", () => {
    expect(buildGroupKey({ type: "POLL_VOTE", pollId: "poll-1" })).toBe(
      "POLL_VOTE:poll-1",
    )
  })

  it("tạo key cho POLL_CLOSED theo poll + recipient (mỗi voter có noti riêng)", () => {
    expect(
      buildGroupKey({
        type: "POLL_CLOSED",
        pollId: "poll-1",
        recipientId: "u1",
      }),
    ).toBe("POLL_CLOSED:poll-1:u1")
  })
})

describe("buildNotificationLink", () => {
  it("FOLLOW trỏ tới trang profile của actor", () => {
    expect(
      buildNotificationLink({ type: "FOLLOW", actorId: "u1" }),
    ).toBe("/profile/u1")
  })

  it("FRIENDSHIP trỏ tới trang profile của actor", () => {
    expect(
      buildNotificationLink({ type: "FRIENDSHIP", actorId: "u1" }),
    ).toBe("/profile/u1")
  })

  it("COMMENT/LIKE/REPOST/COMMENT_REPLY trỏ tới feed deep-link qua query string", () => {
    expect(
      buildNotificationLink({ type: "COMMENT", postId: "p1" }),
    ).toBe("/feed?post=p1")
    expect(
      buildNotificationLink({ type: "LIKE", postId: "p1" }),
    ).toBe("/feed?post=p1")
    expect(
      buildNotificationLink({ type: "REPOST", postId: "p1" }),
    ).toBe("/feed?post=p1")
    expect(
      buildNotificationLink({ type: "COMMENT_REPLY", postId: "p1" }),
    ).toBe("/feed?post=p1")
  })

  it("trả về null khi thiếu thông tin", () => {
    expect(buildNotificationLink({ type: "FOLLOW" })).toBeNull()
    expect(buildNotificationLink({ type: "COMMENT" })).toBeNull()
  })

  it("POLL_VOTE/POLL_CLOSED trỏ về deep-link post", () => {
    expect(
      buildNotificationLink({ type: "POLL_VOTE", postId: "p1" }),
    ).toBe("/feed?post=p1")
    expect(
      buildNotificationLink({ type: "POLL_CLOSED", postId: "p1" }),
    ).toBe("/feed?post=p1")
  })
})

describe("mergeAggregateMetadata", () => {
  it("tạo aggregate mới khi chưa có", () => {
    const result = mergeAggregateMetadata(null, {
      userId: "u1",
      displayName: "An",
      avatarUrl: null,
    })
    expect(result).toEqual({
      actorIds: ["u1"],
      actorNames: ["An"],
      count: 1,
    })
  })

  it("thêm actor mới vào đầu khi aggregate đã có", () => {
    const initial = buildInitialAggregateMetadata({
      userId: "u1",
      displayName: "An",
      avatarUrl: null,
    })
    const merged = mergeAggregateMetadata(initial, {
      userId: "u2",
      displayName: "Binh",
      avatarUrl: null,
    })

    expect(merged.actorIds).toEqual(["u2", "u1"])
    expect(merged.actorNames).toEqual(["Binh", "An"])
    expect(merged.count).toBe(2)
  })

  it("không trùng lặp khi actor cũ like lại", () => {
    const initial = buildInitialAggregateMetadata({
      userId: "u1",
      displayName: "An",
      avatarUrl: null,
    })
    const merged = mergeAggregateMetadata(initial, {
      userId: "u1",
      displayName: "An",
      avatarUrl: null,
    })

    expect(merged.count).toBe(1)
    expect(merged.actorIds).toEqual(["u1"])
  })
})

describe("renderNotification", () => {
  it("FOLLOW với 1 actor", () => {
    const rendered = renderNotification({
      type: "FOLLOW",
      actors: ["An"],
      totalActorCount: 1,
    })

    expect(rendered.title).toBe("An đã theo dõi bạn")
  })

  it("FOLLOW với nhiều actor gộp `và N người khác`", () => {
    const rendered = renderNotification({
      type: "FOLLOW",
      actors: ["An", "Binh", "Chi"],
      totalActorCount: 5,
    })

    expect(rendered.title).toContain("An, Binh")
    expect(rendered.title).toContain("và 3 người khác")
  })

  it("COMMENT gắn kèm commentExcerpt", () => {
    const rendered = renderNotification({
      type: "COMMENT",
      actors: ["An"],
      totalActorCount: 1,
      commentExcerpt: "Bài viết rất hay",
    })

    expect(rendered.title).toBe("An đã bình luận bài viết của bạn")
    expect(rendered.content).toBe("Bài viết rất hay")
  })

  it("LIKE hiển thị postExcerpt khi có", () => {
    const rendered = renderNotification({
      type: "LIKE",
      actors: ["An", "Binh"],
      totalActorCount: 2,
      postExcerpt: "Chia sẻ hôm nay",
    })

    expect(rendered.title).toBe("An, Binh đã thích bài viết của bạn")
    expect(rendered.content).toBe("Chia sẻ hôm nay")
  })

  it("REPOST với nhiều người", () => {
    const rendered = renderNotification({
      type: "REPOST",
      actors: ["An"],
      totalActorCount: 1,
    })

    expect(rendered.title).toBe("An đã chia sẻ bài viết của bạn")
  })

  it("POLL_VOTE hiển thị câu hỏi khảo sát", () => {
    const rendered = renderNotification({
      type: "POLL_VOTE",
      actors: ["An"],
      totalActorCount: 1,
      pollQuestion: "Bạn thích màu nào?",
    })

    expect(rendered.title).toBe("An đã bình chọn trong khảo sát của bạn")
    expect(rendered.content).toBe("Bạn thích màu nào?")
  })

  it("POLL_CLOSED tiêu đề cố định, content là câu hỏi", () => {
    const rendered = renderNotification({
      type: "POLL_CLOSED",
      actors: [],
      totalActorCount: 0,
      pollQuestion: "Chọn địa điểm sự kiện",
    })

    expect(rendered.title).toBe("Khảo sát bạn tham gia đã đóng")
    expect(rendered.content).toBe("Chọn địa điểm sự kiện")
  })
})
