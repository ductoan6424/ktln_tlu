import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  follow: { findMany: vi.fn() },
  hiddenPost: { findMany: vi.fn() },
  post: { findMany: vi.fn() },
  poll: { findMany: vi.fn() },
}));

const fanout = vi.hoisted(() => ({
  getPersonalizedFeedPostIds: vi.fn(),
  getCelebrityAuthorIds: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma }));

vi.mock("@/lib/feed/fanout", () => fanout);

vi.mock("@/lib/feed/config", () => ({
  getFeedFanoutConfig: vi.fn().mockResolvedValue({
    followerThreshold: 500,
    feedCacheSize: 200,
    feedCacheTtlSeconds: 3600,
    followBackfillLimit: 30,
    redisReadCandidateLimit: 10,
    celebrityReadCandidateLimit: 10,
    freshnessOverlayRatio: 0.3,
    freshnessWindowMinutes: 30,
  }),
}));

vi.mock("@/lib/auth/post-permissions", () => ({
  resolveDeleteRole: vi.fn().mockResolvedValue(null),
  canHidePost: vi.fn().mockReturnValue(false),
}));

import { getFeedPosts, INITIAL_FEED_CURSOR } from "@/lib/feed/queries";

const VIEWER_ID = "user-viewer";
const FOLLOWED_A = "user-followed-a";
const RANDOM_C = "user-random-c";

function makeRawPost(
  overrides: Partial<{
    id: string;
    authorId: string;
    content: string;
    createdAt: Date;
  }>,
) {
  return {
    id: overrides.id ?? "post-x",
    content: overrides.content ?? "Noi dung",
    imageUrl: null,
    visibility: "PUBLIC",
    createdAt: overrides.createdAt ?? new Date("2026-04-01T00:00:00.000Z"),
    deletedAt: null,
    deletedBy: null,
    deletedReason: null,
    authorId: overrides.authorId ?? "author-1",
    clubId: null,
    groupId: null,
    sharedPostId: null,
    mediaUrls: null,
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    author: { displayName: "Tac gia", avatarUrl: null },
    likes: [],
    _count: { likes: 0, comments: 0 },
    sharedPost: null,
  };
}

function makeCandidate(
  overrides: Partial<{
    id: string;
    authorId: string;
    createdAt: Date;
  }>,
) {
  return {
    id: overrides.id ?? "candidate-x",
    authorId: overrides.authorId ?? "author-1",
    createdAt: overrides.createdAt ?? new Date("2026-04-01T00:00:00.000Z"),
  };
}

function mockHybridPostQueries(buckets: {
  personalized?: ReturnType<typeof makeCandidate>[];
  celebrity?: ReturnType<typeof makeCandidate>[];
  fallbackFollowed?: ReturnType<typeof makeCandidate>[];
  freshness?: ReturnType<typeof makeCandidate>[];
  rest?: ReturnType<typeof makeCandidate>[];
  full?: ReturnType<typeof makeRawPost>[];
}) {
  prisma.post.findMany.mockImplementation(
    async (args: {
      include?: unknown;
      where?: {
        id?: { in?: string[] };
        authorId?: { in?: string[]; notIn?: string[] };
        createdAt?: { gte?: Date };
      };
      take?: number;
    }) => {
      if (args.include && args.where?.id?.in) return buckets.full ?? [];
      if (args.where?.id?.in) return buckets.personalized ?? [];
      if (args.where?.createdAt?.gte) return buckets.freshness ?? [];
      if (args.where?.authorId?.notIn || !args.where?.authorId)
        return buckets.rest ?? [];
      if (args.where?.authorId?.in && args.take === 10)
        return buckets.celebrity ?? [];
      if (args.where?.authorId?.in) return buckets.fallbackFollowed ?? [];
      return [];
    },
  );
}

beforeEach(() => {
  prisma.follow.findMany.mockReset();
  prisma.hiddenPost.findMany.mockReset();
  prisma.post.findMany.mockReset();
  prisma.poll.findMany.mockReset();
  fanout.getPersonalizedFeedPostIds.mockReset();
  fanout.getCelebrityAuthorIds.mockReset();
  prisma.hiddenPost.findMany.mockResolvedValue([]);
  prisma.poll.findMany.mockResolvedValue([]);
  fanout.getPersonalizedFeedPostIds.mockResolvedValue([]);
  fanout.getCelebrityAuthorIds.mockResolvedValue([]);
});

describe("getFeedPosts hybrid feed", () => {
  it("anonymous viewer: does not query follow or fanout, returns freshness and rest posts", async () => {
    const freshness = makeCandidate({ id: "fresh-1", authorId: RANDOM_C });
    const rest = makeCandidate({ id: "rest-1", authorId: RANDOM_C });
    mockHybridPostQueries({
      freshness: [freshness],
      rest: [rest],
      full: [
        makeRawPost({ id: "fresh-1", authorId: RANDOM_C }),
        makeRawPost({ id: "rest-1", authorId: RANDOM_C }),
      ],
    });

    const result = await getFeedPosts(null, INITIAL_FEED_CURSOR, 2);

    expect(prisma.follow.findMany).not.toHaveBeenCalled();
    expect(fanout.getPersonalizedFeedPostIds).not.toHaveBeenCalled();
    expect(fanout.getCelebrityAuthorIds).not.toHaveBeenCalled();
    expect(result.posts.map((post) => post.id)).toEqual(["fresh-1", "rest-1"]);
    expect(result.posts.every((post) => !post.isFromFollowed)).toBe(true);
    expect(result.nextCursor.followedExhausted).toBe(true);
  });

  it("logged-in viewer with no follows returns freshness and rest posts", async () => {
    prisma.follow.findMany.mockResolvedValue([]);
    const freshness = makeCandidate({ id: "fresh-1", authorId: RANDOM_C });
    const rest = makeCandidate({ id: "rest-1", authorId: RANDOM_C });
    mockHybridPostQueries({
      freshness: [freshness],
      rest: [rest],
      full: [
        makeRawPost({ id: "fresh-1", authorId: RANDOM_C }),
        makeRawPost({ id: "rest-1", authorId: RANDOM_C }),
      ],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 2);

    expect(result.posts.map((post) => post.id)).toEqual(["fresh-1", "rest-1"]);
    expect(result.posts.every((post) => !post.isFromFollowed)).toBe(true);
    expect(result.nextCursor.followedExhausted).toBe(true);
  });

  it("merges freshness overlay before followed cache and rest fill", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    fanout.getPersonalizedFeedPostIds.mockResolvedValue(["cached-1"]);
    const freshness = makeCandidate({
      id: "fresh-1",
      authorId: RANDOM_C,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    const cached = makeCandidate({
      id: "cached-1",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
    });
    const rest = makeCandidate({
      id: "rest-1",
      authorId: RANDOM_C,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
    });
    mockHybridPostQueries({
      personalized: [cached],
      freshness: [freshness],
      rest: [rest],
      full: [
        makeRawPost({ id: "fresh-1", authorId: RANDOM_C }),
        makeRawPost({ id: "cached-1", authorId: FOLLOWED_A }),
        makeRawPost({ id: "rest-1", authorId: RANDOM_C }),
      ],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 3);

    expect(result.posts.map((post) => post.id)).toEqual([
      "fresh-1",
      "cached-1",
      "rest-1",
    ]);
    expect(result.posts[1]?.isFromFollowed).toBe(true);
    expect(result.nextCursor.redisFetched).toBe(1);
    expect(result.nextCursor.freshnessFetched).toBe(1);
  });

  it("does not query rest when freshness and followed cache fill the page", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    fanout.getPersonalizedFeedPostIds.mockResolvedValue(["cached-1"]);
    const freshness = makeCandidate({
      id: "fresh-1",
      authorId: RANDOM_C,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    const cached = makeCandidate({
      id: "cached-1",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
    });
    mockHybridPostQueries({
      personalized: [cached],
      freshness: [freshness],
      rest: [makeCandidate({ id: "rest-1", authorId: RANDOM_C })],
      full: [
        makeRawPost({ id: "fresh-1", authorId: RANDOM_C }),
        makeRawPost({ id: "cached-1", authorId: FOLLOWED_A }),
      ],
    });

    const result = await getFeedPosts(
      VIEWER_ID,
      { ...INITIAL_FEED_CURSOR, restFetched: 7 },
      2,
    );

    const restCalls = prisma.post.findMany.mock.calls.filter((call) => {
      const args = call[0] as { where?: { authorId?: { notIn?: string[] } } };
      return Boolean(args.where?.authorId?.notIn);
    });
    expect(restCalls).toHaveLength(0);
    expect(result.posts.map((post) => post.id)).toEqual([
      "fresh-1",
      "cached-1",
    ]);
    expect(result.nextCursor.restFetched).toBe(7);
  });

  it("uses DB followed fallback when personalized and celebrity candidates are empty", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    const followed = makeCandidate({ id: "followed-1", authorId: FOLLOWED_A });
    mockHybridPostQueries({
      fallbackFollowed: [followed],
      full: [makeRawPost({ id: "followed-1", authorId: FOLLOWED_A })],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 2);

    expect(result.posts.map((post) => post.id)).toEqual(["followed-1"]);
    expect(result.posts[0]?.isFromFollowed).toBe(true);
    expect(result.nextCursor.followedFetched).toBe(1);
  });

  it("limits DB followed fallback to remaining page slots after freshness", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    const freshness = makeCandidate({ id: "fresh-1", authorId: RANDOM_C });
    const followedCandidates = [
      makeCandidate({ id: "followed-1", authorId: FOLLOWED_A }),
      makeCandidate({ id: "followed-2", authorId: FOLLOWED_A }),
      makeCandidate({ id: "followed-3", authorId: FOLLOWED_A }),
    ];
    prisma.post.findMany.mockImplementation(
      async (args: {
        include?: unknown;
        where?: {
          id?: { in?: string[] };
          authorId?: { in?: string[]; notIn?: string[] };
          createdAt?: { gte?: Date };
        };
        take?: number;
      }) => {
        if (args.include && args.where?.id?.in) {
          return [
            makeRawPost({ id: "fresh-1", authorId: RANDOM_C }),
            makeRawPost({ id: "followed-1", authorId: FOLLOWED_A }),
            makeRawPost({ id: "followed-2", authorId: FOLLOWED_A }),
          ];
        }
        if (args.where?.createdAt?.gte) return [freshness];
        if (args.where?.authorId?.notIn) return [];
        if (args.where?.authorId?.in) {
          return followedCandidates.slice(0, args.take);
        }
        return [];
      },
    );

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 3);

    const fallbackCall = prisma.post.findMany.mock.calls.find((call) => {
      const args = call[0] as { where?: { authorId?: { in?: string[] } } };
      return Boolean(args.where?.authorId?.in);
    })?.[0] as { take?: number };
    expect(fallbackCall.take).toBe(2);
    expect(result.posts.map((post) => post.id)).toEqual([
      "fresh-1",
      "followed-1",
      "followed-2",
    ]);
    expect(result.nextCursor.followedFetched).toBe(2);
  });

  it("includes hidden post IDs in DB query where.id.notIn", async () => {
    prisma.hiddenPost.findMany.mockResolvedValue([{ postId: "hidden-1" }]);
    prisma.follow.findMany.mockResolvedValue([]);
    mockHybridPostQueries({});

    await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 2);

    const calls = prisma.post.findMany.mock.calls.map((call) => call[0]) as {
      where?: { id?: { notIn?: string[] } };
    }[];
    expect(
      calls.some(
        (call) => call.where?.id?.notIn?.includes("hidden-1") ?? false,
      ),
    ).toBe(true);
  });
});
