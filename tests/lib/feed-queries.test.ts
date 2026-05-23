import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  follow: { findMany: vi.fn() },
  hiddenPost: { findMany: vi.fn() },
  post: { findMany: vi.fn() },
  poll: { findMany: vi.fn() },
  groupMember: { findMany: vi.fn() },
  clubMember: { findMany: vi.fn() },
  courseMember: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
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
  resolveDeleteRolesBatch: vi.fn().mockResolvedValue(new Map()),
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
    courseId: null,
    sharedPostId: null,
    mediaUrls: null,
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    author: { displayName: "Tac gia", avatarUrl: null, coverUrl: null },
    likes: [],
    savedBy: [],
    _count: { likes: 0, comments: 0 },
    sharedPost: null,
    group: null,
    club: null,
    course: null,
    attachments: [],
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

function getWhereIdIn(where?: {
  id?: { in?: string[] };
  AND?: Array<{ id?: { in?: string[] } }>;
}) {
  return where?.id?.in ?? where?.AND?.find((clause) => clause.id?.in)?.id?.in;
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
        AND?: Array<{ id?: { in?: string[] } }>;
        authorId?: { in?: string[]; notIn?: string[] };
        createdAt?: { gte?: Date };
      };
      take?: number;
    }) => {
      const idIn = getWhereIdIn(args.where);

      if (args.include && idIn) return buckets.full ?? [];
      if (idIn) return buckets.personalized ?? [];
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
  prisma.groupMember.findMany.mockReset();
  prisma.clubMember.findMany.mockReset();
  prisma.courseMember.findMany.mockReset();
  prisma.course.findMany.mockReset();
  fanout.getPersonalizedFeedPostIds.mockReset();
  fanout.getCelebrityAuthorIds.mockReset();
  prisma.hiddenPost.findMany.mockResolvedValue([]);
  prisma.poll.findMany.mockResolvedValue([]);
  prisma.groupMember.findMany.mockResolvedValue([]);
  prisma.clubMember.findMany.mockResolvedValue([]);
  prisma.courseMember.findMany.mockResolvedValue([]);
  prisma.course.findMany.mockResolvedValue([]);
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

  it("advances fallback and rest cursors when earlier sources fill the page", async () => {
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
    const followedFill = makeCandidate({
      id: "followed-2",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
    });
    mockHybridPostQueries({
      personalized: [cached],
      freshness: [freshness],
      fallbackFollowed: [cached, followedFill],
      rest: [freshness, makeCandidate({ id: "rest-1", authorId: RANDOM_C })],
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

    expect(result.posts.map((post) => post.id)).toEqual([
      "fresh-1",
      "cached-1",
    ]);
    expect(result.nextCursor.followedFetched).toBe(1);
    expect(result.nextCursor.restFetched).toBe(8);
  });

  it("advances redis cursor for a cached candidate duplicated by freshness", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    fanout.getPersonalizedFeedPostIds.mockResolvedValue(["dup-1"]);
    const duplicate = makeCandidate({
      id: "dup-1",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    mockHybridPostQueries({
      personalized: [duplicate],
      freshness: [duplicate],
      full: [makeRawPost({ id: "dup-1", authorId: FOLLOWED_A })],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 2);

    expect(result.posts.map((post) => post.id)).toEqual(["dup-1"]);
    expect(result.nextCursor.redisFetched).toBe(1);
  });

  it("advances redis cursor past stale IDs filtered before valid cached posts", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    fanout.getPersonalizedFeedPostIds.mockResolvedValue([
      "hidden-1",
      "cached-1",
    ]);
    const cached = makeCandidate({
      id: "cached-1",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    mockHybridPostQueries({
      personalized: [cached],
      full: [makeRawPost({ id: "cached-1", authorId: FOLLOWED_A })],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 2);

    expect(result.posts.map((post) => post.id)).toEqual(["cached-1"]);
    expect(result.nextCursor.redisFetched).toBe(2);
  });

  it("advances redis cursor past stale prefix when page fills before valid redis consumption", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    fanout.getPersonalizedFeedPostIds.mockResolvedValue([
      "stale-hidden",
      "valid-redis",
    ]);
    fanout.getCelebrityAuthorIds.mockResolvedValue([FOLLOWED_A]);
    const freshness = makeCandidate({
      id: "fresh-1",
      authorId: RANDOM_C,
      createdAt: new Date("2026-04-04T00:00:00.000Z"),
    });
    const celebrity = makeCandidate({
      id: "celebrity-1",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    const validRedis = makeCandidate({
      id: "valid-redis",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
    });
    mockHybridPostQueries({
      personalized: [validRedis],
      celebrity: [celebrity],
      freshness: [freshness],
      full: [
        makeRawPost({ id: "fresh-1", authorId: RANDOM_C }),
        makeRawPost({ id: "celebrity-1", authorId: FOLLOWED_A }),
      ],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 2);

    expect(result.posts.map((post) => post.id)).toEqual([
      "fresh-1",
      "celebrity-1",
    ]);
    expect(result.nextCursor.redisFetched).toBe(1);
  });

  it("advances redis cursor only by followed candidates consumed before page fill", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    fanout.getPersonalizedFeedPostIds.mockResolvedValue([
      "cached-1",
      "cached-2",
      "cached-3",
    ]);
    const freshness = makeCandidate({
      id: "fresh-1",
      authorId: RANDOM_C,
      createdAt: new Date("2026-04-04T00:00:00.000Z"),
    });
    const cachedCandidates = [
      makeCandidate({
        id: "cached-1",
        authorId: FOLLOWED_A,
        createdAt: new Date("2026-04-03T00:00:00.000Z"),
      }),
      makeCandidate({
        id: "cached-2",
        authorId: FOLLOWED_A,
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
      }),
      makeCandidate({
        id: "cached-3",
        authorId: FOLLOWED_A,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      }),
    ];
    mockHybridPostQueries({
      personalized: cachedCandidates,
      freshness: [freshness],
      full: [
        makeRawPost({ id: "fresh-1", authorId: RANDOM_C }),
        makeRawPost({ id: "cached-1", authorId: FOLLOWED_A }),
        makeRawPost({ id: "cached-2", authorId: FOLLOWED_A }),
      ],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 3);

    expect(result.posts.map((post) => post.id)).toEqual([
      "fresh-1",
      "cached-1",
      "cached-2",
    ]);
    expect(result.nextCursor.redisFetched).toBe(2);
  });

  it("advances celebrity cursor through a duplicate selected from Redis", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    fanout.getPersonalizedFeedPostIds.mockResolvedValue(["dup-followed"]);
    fanout.getCelebrityAuthorIds.mockResolvedValue([FOLLOWED_A]);
    const duplicate = makeCandidate({
      id: "dup-followed",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    mockHybridPostQueries({
      personalized: [duplicate],
      celebrity: [duplicate],
      full: [makeRawPost({ id: "dup-followed", authorId: FOLLOWED_A })],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 1);

    expect(result.posts.map((post) => post.id)).toEqual(["dup-followed"]);
    expect(result.nextCursor.redisFetched).toBe(1);
    expect(result.nextCursor.celebrityFetched).toBe(1);
  });

  it("fills a partial Redis followed cache from DB followed fallback before rest", async () => {
    prisma.follow.findMany.mockResolvedValue([{ followingId: FOLLOWED_A }]);
    fanout.getPersonalizedFeedPostIds.mockResolvedValue(["cached-1"]);
    const cached = makeCandidate({
      id: "cached-1",
      authorId: FOLLOWED_A,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    const fallbackFollowed = makeCandidate({
      id: "followed-2",
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
      fallbackFollowed: [cached, fallbackFollowed],
      rest: [rest],
      full: [
        makeRawPost({ id: "cached-1", authorId: FOLLOWED_A }),
        makeRawPost({ id: "followed-2", authorId: FOLLOWED_A }),
      ],
    });

    const result = await getFeedPosts(VIEWER_ID, INITIAL_FEED_CURSOR, 2);

    expect(result.posts.map((post) => post.id)).toEqual([
      "cached-1",
      "followed-2",
    ]);
    expect(result.nextCursor.followedFetched).toBe(2);
    expect(result.nextCursor.restFetched).toBe(0);
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
          AND?: Array<{ id?: { in?: string[] } }>;
          authorId?: { in?: string[]; notIn?: string[] };
          createdAt?: { gte?: Date };
        };
        take?: number;
      }) => {
        if (args.include && getWhereIdIn(args.where)) {
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
    expect(fallbackCall.take).toBe(3);
    expect(result.posts.map((post) => post.id)).toEqual([
      "fresh-1",
      "followed-1",
      "followed-2",
    ]);
    expect(result.nextCursor.followedFetched).toBe(2);
  });

  it("advances rest cursor for a rest candidate duplicated by freshness", async () => {
    const duplicate = makeCandidate({ id: "dup-1", authorId: RANDOM_C });
    mockHybridPostQueries({
      freshness: [duplicate],
      rest: [duplicate],
      full: [makeRawPost({ id: "dup-1", authorId: RANDOM_C })],
    });

    const result = await getFeedPosts(null, INITIAL_FEED_CURSOR, 2);

    expect(result.posts.map((post) => post.id)).toEqual(["dup-1"]);
    expect(result.nextCursor.restFetched).toBe(1);
  });

  it("overreads rest when duplicate candidates appear before unique fill", async () => {
    const duplicate = makeCandidate({
      id: "dup-1",
      authorId: RANDOM_C,
      createdAt: new Date("2026-04-03T00:00:00.000Z"),
    });
    const unique = makeCandidate({
      id: "rest-2",
      authorId: RANDOM_C,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
    });
    const restCandidates = [duplicate, unique];
    prisma.post.findMany.mockImplementation(
      async (args: {
        include?: unknown;
        where?: {
          id?: { in?: string[] };
          AND?: Array<{ id?: { in?: string[] } }>;
          authorId?: { in?: string[]; notIn?: string[] };
          createdAt?: { gte?: Date };
        };
        take?: number;
      }) => {
        if (args.include && getWhereIdIn(args.where)) {
          return [
            makeRawPost({ id: "dup-1", authorId: RANDOM_C }),
            makeRawPost({ id: "rest-2", authorId: RANDOM_C }),
          ];
        }
        if (args.where?.createdAt?.gte) return [duplicate];
        if (args.where?.authorId?.notIn || !args.where?.authorId) {
          return restCandidates.slice(0, args.take);
        }
        return [];
      },
    );

    const result = await getFeedPosts(null, INITIAL_FEED_CURSOR, 2);

    expect(result.posts.map((post) => post.id)).toEqual(["dup-1", "rest-2"]);
    expect(result.nextCursor.restFetched).toBe(2);
    expect(result.hasMore).toBe(true);
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
