import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { formatRelativeTime } from "@/utils/formatters";
import {
  canHidePost,
  resolveDeleteRolesBatch,
  type DeleteRole,
} from "@/lib/auth/post-permissions";
import { getPollsForPosts } from "@/lib/polls/queries";
import type { PollView } from "@/lib/polls/types";
import { getFeedFanoutConfig } from "@/lib/feed/config";
import {
  getCelebrityAuthorIds,
  getPersonalizedFeedPostIds,
} from "@/lib/feed/fanout";
import { buildCommunityPath } from "@/lib/communities/urls";
import {
  buildVisiblePostSqlWhere,
  buildVisiblePostWhere,
} from "@/lib/posts/visibility";

export type FeedCursor = {
  redisFetched: number;
  celebrityFetched: number;
  freshnessFetched: number;
  followedFetched: number;
  restFetched: number;
  followedExhausted: boolean;
};

export type FeedPostPermissions = {
  canDelete: boolean;
  canHide: boolean;
  deleteRole: "AUTHOR" | "MODERATOR" | null;
};

export type FeedSharedPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
};

export type FeedPostCommunityContext = {
  type: "GROUP" | "CLUB" | "COURSE";
  id: string;
  name: string;
  href: string;
  avatarUrl: string | null;
};

export type FeedPostAttachment = {
  id: string;
  url: string;
  type: "IMAGE" | "FILE";
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export type FeedPostDto = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  createdAtRelative: string;
  visibility: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  authorCoverUrl: string | null;
  isLiked: boolean;
  isSaved: boolean;
  likes: number;
  comments: number;
  isFromFollowed: boolean;
  permissions: FeedPostPermissions;
  sharedPost: FeedSharedPost | null;
  communityContext: FeedPostCommunityContext | null;
  attachments: FeedPostAttachment[];
  poll: PollView | null;
};

export type FeedPage = {
  posts: FeedPostDto[];
  nextCursor: FeedCursor;
  hasMore: boolean;
};

export const INITIAL_FEED_CURSOR: FeedCursor = {
  redisFetched: 0,
  celebrityFetched: 0,
  freshnessFetched: 0,
  followedFetched: 0,
  restFetched: 0,
  followedExhausted: false,
};

type RawFeedPostBase = Prisma.PostGetPayload<{
  include: {
    author: { select: { displayName: true; avatarUrl: true; coverUrl: true } };
    likes: { where: { userId: string }; select: { id: true } };
    _count: { select: { likes: true; comments: true } };
    sharedPost: {
      select: {
        id: true;
        content: true;
        imageUrl: true;
        deletedAt: true;
        author: { select: { displayName: true; avatarUrl: true } };
      };
    };
    group: { select: { name: true; shortId: true; coverUrl: true } };
    club: {
      select: {
        name: true;
        shortId: true;
        logoUrl: true;
        coverUrl: true;
      };
    };
    course: { select: { code: true; name: true; shortId: true; coverUrl: true } };
    attachments: {
      select: {
        id: true;
        url: true;
        type: true;
        name: true;
        mimeType: true;
        sizeBytes: true;
      };
    };
  };
}>;

type RawFeedPost = Omit<RawFeedPostBase, "likes"> & {
  likes?: Array<{ id: string }> | false;
  savedBy?: Array<{ userId: string }> | false;
};

type FeedCandidatePost = {
  id: string;
  authorId: string;
  createdAt: Date;
};

type RedisFeedCandidatePost = FeedCandidatePost & {
  redisIndex: number;
  post?: RawFeedPost;
};

type FeedCandidateSource =
  | "redis"
  | "celebrity"
  | "freshness"
  | "fallback"
  | "rest";

type SelectedFeedCandidate = FeedCandidatePost & {
  isFromFollowed: boolean;
  source: FeedCandidateSource;
  redisIndex?: number;
  post?: RawFeedPost;
};

type CandidateSourceCounts = Record<FeedCandidateSource, number>;

type RawFeedCandidateRow = FeedCandidatePost & {
  source: FeedCandidateSource;
  redisIndex: number | null;
};

type HybridCandidateBuckets = {
  freshness: FeedCandidatePost[];
  redis: RedisFeedCandidatePost[];
  celebrity: FeedCandidatePost[];
  fallback: FeedCandidatePost[];
  rest: FeedCandidatePost[];
};

const candidateSelect = {
  id: true,
  authorId: true,
  createdAt: true,
} as const;

async function getFollowingIds(viewerId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: {
      followerId: viewerId,
      following: { is: { deletedAt: null } },
    },
    select: { followingId: true },
  });
  return rows.map((r) => r.followingId);
}

async function getHiddenPostIds(viewerId: string | null): Promise<string[]> {
  if (!viewerId) return [];
  const rows = await prisma.hiddenPost.findMany({
    where: { userId: viewerId },
    select: { postId: true },
  });
  return rows.map((r) => r.postId);
}

function buildPostInclude(viewerId: string | null) {
  return {
    author: {
      select: {
        displayName: true,
        avatarUrl: true,
        coverUrl: true,
      },
    },
    likes: viewerId
      ? { where: { userId: viewerId }, select: { id: true } }
      : false,
    savedBy: viewerId
      ? { where: { userId: viewerId }, select: { userId: true } }
      : false,
    _count: {
      select: { likes: true, comments: true },
    },
    sharedPost: {
      select: {
        id: true,
        content: true,
        imageUrl: true,
        deletedAt: true,
        author: { select: { displayName: true, avatarUrl: true } },
      },
    },
    group: {
      select: { name: true, shortId: true, coverUrl: true },
    },
    club: {
      select: { name: true, shortId: true, logoUrl: true, coverUrl: true },
    },
    course: {
      select: { code: true, name: true, shortId: true, coverUrl: true },
    },
    attachments: {
      select: {
        id: true,
        url: true,
        type: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
      },
      orderBy: { createdAt: "asc" },
    },
  } as const;
}

function buildFeedPermissions(
  post: RawFeedPost,
  viewerId: string | null,
  role: DeleteRole | null,
): FeedPostPermissions {
  if (!viewerId) {
    return { canDelete: false, canHide: false, deleteRole: null };
  }
  return {
    canDelete: role !== null,
    canHide: canHidePost(viewerId, {
      postId: post.id,
      authorId: post.authorId,
      clubId: post.clubId,
      groupId: post.groupId,
    }),
    deleteRole:
      role === "AUTHOR" ? "AUTHOR" : role !== null ? "MODERATOR" : null,
  };
}

function mapRawPost(
  post: RawFeedPost,
  isFromFollowed: boolean,
  poll: PollView | null,
  permissions: FeedPostPermissions,
): FeedPostDto {
  const sharedPost =
    post.sharedPost && !post.sharedPost.deletedAt
      ? {
          id: post.sharedPost.id,
          content: post.sharedPost.content,
          imageUrl: post.sharedPost.imageUrl,
          authorDisplayName: post.sharedPost.author.displayName,
          authorAvatarUrl: post.sharedPost.author.avatarUrl,
        }
      : null;

  const likesArr = Array.isArray(post.likes) ? post.likes : [];
  const savedArr = Array.isArray(post.savedBy) ? post.savedBy : [];
  const communityContext: FeedPostCommunityContext | null = post.group
    ? {
        type: "GROUP",
        id: post.groupId!,
        name: post.group.name,
        href: buildCommunityPath("GROUP", post.group.name, post.group.shortId),
        avatarUrl: post.group.coverUrl,
      }
    : post.club
      ? {
          type: "CLUB",
          id: post.clubId!,
          name: post.club.name,
          href: buildCommunityPath("CLUB", post.club.name, post.club.shortId),
          avatarUrl: post.club.logoUrl ?? post.club.coverUrl,
        }
      : post.course
        ? {
            type: "COURSE",
            id: post.courseId!,
            name: post.course.name,
            href: buildCommunityPath("COURSE", post.course.code, post.course.shortId),
            avatarUrl: post.course.coverUrl,
          }
        : null;

  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    createdAt: post.createdAt.toISOString(),
    createdAtRelative: formatRelativeTime(post.createdAt),
    visibility: post.visibility,
    authorId: post.authorId,
    authorDisplayName: post.author.displayName,
    authorAvatarUrl: post.author.avatarUrl,
    authorCoverUrl: post.author.coverUrl,
    isLiked: likesArr.length > 0,
    isSaved: savedArr.length > 0,
    likes: post._count.likes,
    comments: post._count.comments,
    isFromFollowed,
    permissions,
    sharedPost,
    communityContext,
    attachments: post.attachments.map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      type: attachment.type,
      name: attachment.name,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })),
    poll,
  };
}

export type CommunityFeedWhereInput = {
  viewerId: string | null;
  joinedGroupIds: string[];
  joinedClubIds: string[];
  joinedCourseIds: string[];
  hiddenIds: string[];
};

export function buildCommunityFeedWhere({
  joinedGroupIds,
  joinedClubIds,
  joinedCourseIds,
  hiddenIds,
}: CommunityFeedWhereInput): Prisma.PostWhereInput {
  return buildVisiblePostWhere({
    joinedGroupIds,
    joinedClubIds,
    joinedCourseIds,
    hiddenIds,
  });
}

export function buildCommunityDetailPostWhere(
  type: FeedPostCommunityContext["type"],
  targetId: string,
  hiddenIds: string[] = [],
): Prisma.PostWhereInput {
  const targetWhere =
    type === "GROUP"
      ? { groupId: targetId }
      : type === "CLUB"
        ? { clubId: targetId }
        : { courseId: targetId };

  return {
    visibility: "PUBLIC",
    deletedAt: null,
    communityStatus: "PUBLISHED",
    ...targetWhere,
    ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
  };
}

export async function getCommunityDetailPosts(input: {
  type: FeedPostCommunityContext["type"];
  targetId: string;
  viewerId: string | null;
  pageSize?: number;
}): Promise<FeedPostDto[]> {
  const hiddenIds = await getHiddenPostIds(input.viewerId);
  const posts = (await prisma.post.findMany({
    where: buildCommunityDetailPostWhere(input.type, input.targetId, hiddenIds),
    include: buildPostInclude(input.viewerId),
    orderBy: { createdAt: "desc" },
    take: input.pageSize ?? 20,
  })) as RawFeedPost[];

  const postIds = posts.map((post) => post.id);
  const [pollMap, permissionsMap] = await Promise.all([
    getPollsForPosts(postIds, input.viewerId),
    input.viewerId
      ? resolveDeleteRolesBatch(
          input.viewerId,
          posts.map((post) => ({
            postId: post.id,
            authorId: post.authorId,
            clubId: post.clubId,
            groupId: post.groupId,
          })),
        )
      : Promise.resolve(new Map<string, DeleteRole | null>()),
  ]);

  return posts.map((post) =>
    mapRawPost(
      post,
      false,
      pollMap.get(post.id) ?? null,
      buildFeedPermissions(
        post,
        input.viewerId,
        permissionsMap.get(post.id) ?? null,
      ),
    ),
  );
}

export async function getJoinedCommunityIds(viewerId: string | null): Promise<{
  joinedGroupIds: string[];
  joinedClubIds: string[];
  joinedCourseIds: string[];
}> {
  if (!viewerId) {
    return {
      joinedGroupIds: [],
      joinedClubIds: [],
      joinedCourseIds: [],
    };
  }

  const [groups, clubs, courseMembers, teachingCourses] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId: viewerId },
      select: { groupId: true },
    }),
    prisma.clubMember.findMany({
      where: { userId: viewerId },
      select: { clubId: true },
    }),
    prisma.courseMember.findMany({
      where: { userId: viewerId },
      select: { courseId: true },
    }),
    prisma.course.findMany({
      where: { lecturerId: viewerId, deletedAt: null },
      select: { id: true },
    }),
  ]);

  return {
    joinedGroupIds: groups.map((row) => row.groupId),
    joinedClubIds: clubs.map((row) => row.clubId),
    joinedCourseIds: Array.from(
      new Set([
        ...courseMembers.map((row) => row.courseId),
        ...teachingCourses.map((row) => row.id),
      ]),
    ),
  };
}

function buildIdWhere(
  ids: string[],
  baseWhere: Prisma.PostWhereInput,
): Prisma.PostWhereInput {
  return {
    AND: [baseWhere, { id: { in: ids } }],
  };
}

function byCreatedAtDesc(a: FeedCandidatePost, b: FeedCandidatePost): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function createCandidateSourceCounts(): CandidateSourceCounts {
  return {
    redis: 0,
    celebrity: 0,
    freshness: 0,
    fallback: 0,
    rest: 0,
  };
}

function toSelectedFeedCandidate(
  post: FeedCandidatePost,
  source: FeedCandidateSource,
  isFromFollowed: boolean,
  redisIndex?: number,
): SelectedFeedCandidate {
  const postWithData = post as FeedCandidatePost & { post?: RawFeedPost };
  return {
    id: post.id,
    authorId: post.authorId,
    createdAt: post.createdAt,
    isFromFollowed,
    source,
    redisIndex,
    ...(postWithData.post ? { post: postWithData.post } : {}),
  };
}

function consumeCandidates(
  target: SelectedFeedCandidate[],
  seenIds: Set<string>,
  candidates: SelectedFeedCandidate[],
  limit: number,
): {
  consumed: number;
  selectedCount: number;
  sourceCounts: CandidateSourceCounts;
  consumedRedisIndexes: Set<number>;
} {
  let consumed = 0;
  let selectedCount = 0;
  const consumedRedisIndexes = new Set<number>();
  const sourceCounts = createCandidateSourceCounts();

  for (const candidate of candidates) {
    const alreadySeen = seenIds.has(candidate.id);
    if (target.length >= limit && !alreadySeen) break;

    consumed += 1;
    sourceCounts[candidate.source] += 1;
    if (candidate.source === "redis" && candidate.redisIndex !== undefined) {
      consumedRedisIndexes.add(candidate.redisIndex);
    }

    if (alreadySeen) continue;

    seenIds.add(candidate.id);
    target.push(candidate);
    selectedCount += 1;
  }

  return { consumed, selectedCount, sourceCounts, consumedRedisIndexes };
}

function getSeenPrefixCount(
  candidates: FeedCandidatePost[],
  seenIds: Set<string>,
): number {
  let count = 0;
  for (const candidate of candidates) {
    if (!seenIds.has(candidate.id)) break;
    count += 1;
  }
  return count;
}

function getRedisCursorAdvance(params: {
  personalizedIdCount: number;
  redisCandidates: RedisFeedCandidatePost[];
  consumedRedisIndexes: Set<number>;
  seenIds: Set<string>;
}): number {
  const candidatesByIndex = new Map(
    params.redisCandidates.map((candidate) => [
      candidate.redisIndex,
      candidate,
    ] as const),
  );

  let advance = 0;
  for (let index = 0; index < params.personalizedIdCount; index += 1) {
    const candidate = candidatesByIndex.get(index);
    if (!candidate) {
      advance = index + 1;
      continue;
    }

    if (
      params.consumedRedisIndexes.has(index) ||
      params.seenIds.has(candidate.id)
    ) {
      advance = index + 1;
      continue;
    }

    break;
  }

  return advance;
}

function getOverreadTake(
  remainingSlots: number,
  freshnessQuota: number,
  followedCandidateCount: number,
  pageSize: number,
): number {
  return Math.min(
    Math.max(
      remainingSlots,
      remainingSlots + freshnessQuota + followedCandidateCount,
    ),
    pageSize * 3,
  );
}

function sqlTextArray(values: string[]) {
  return values.length > 0
    ? Prisma.sql`ARRAY[${Prisma.join(values)}]::text[]`
    : Prisma.sql`ARRAY[]::text[]`;
}

function splitHybridCandidateRows(rows: RawFeedCandidateRow[]): HybridCandidateBuckets {
  const buckets: HybridCandidateBuckets = {
    freshness: [],
    redis: [],
    celebrity: [],
    fallback: [],
    rest: [],
  };

  for (const row of rows) {
    if (row.source === "redis") {
      if (row.redisIndex === null) continue;
      buckets.redis.push({ ...row, redisIndex: row.redisIndex });
      continue;
    }
    buckets[row.source].push(row);
  }

  buckets.freshness.sort(byCreatedAtDesc);
  buckets.redis.sort(byCreatedAtDesc);
  buckets.celebrity.sort(byCreatedAtDesc);
  buckets.fallback.sort(byCreatedAtDesc);
  buckets.rest.sort(byCreatedAtDesc);

  return buckets;
}

async function getHybridCandidateBuckets(input: {
  viewerId: string;
  joinedCommunityIds: Awaited<ReturnType<typeof getJoinedCommunityIds>>;
  hiddenIds: string[];
  followingIds: string[];
  followedCelebrityIds: string[];
  personalizedIds: string[];
  freshnessSince: Date;
  freshnessFetched: number;
  freshnessQuota: number;
  redisFetched: number;
  celebrityFetched: number;
  followedFetched: number;
  restFetched: number;
  candidateTake: number;
}): Promise<HybridCandidateBuckets> {
  const visibleWhere = buildVisiblePostSqlWhere({
    ...input.joinedCommunityIds,
    hiddenIds: input.hiddenIds,
  });
  const followingArray = sqlTextArray(input.followingIds);
  const personalizedArray = sqlTextArray(input.personalizedIds);
  const celebrityArray = sqlTextArray(input.followedCelebrityIds);

  const rows = await prisma.$queryRaw<RawFeedCandidateRow[]>(Prisma.sql`
    WITH freshness AS (
      SELECT
        p.post_id AS id,
        p.author_id AS "authorId",
        p.created_at AS "createdAt",
        'freshness'::text AS source,
        NULL::int AS "redisIndex"
      FROM posts p
      WHERE ${visibleWhere}
        AND p.created_at >= ${input.freshnessSince}
      ORDER BY p.created_at DESC
      OFFSET ${input.freshnessFetched}
      LIMIT ${input.freshnessQuota}
    ),
    redis AS (
      SELECT
        p.post_id AS id,
        p.author_id AS "authorId",
        p.created_at AS "createdAt",
        'redis'::text AS source,
        (array_position(${personalizedArray}, p.post_id) - 1)::int AS "redisIndex"
      FROM posts p
      WHERE ${visibleWhere}
        AND p.post_id = ANY(${personalizedArray})
        AND (p.author_id = ${input.viewerId} OR p.author_id = ANY(${followingArray}))
      ORDER BY p.created_at DESC
    ),
    celebrity AS (
      SELECT
        p.post_id AS id,
        p.author_id AS "authorId",
        p.created_at AS "createdAt",
        'celebrity'::text AS source,
        NULL::int AS "redisIndex"
      FROM posts p
      WHERE ${visibleWhere}
        AND p.author_id = ANY(${celebrityArray})
      ORDER BY p.created_at DESC
      OFFSET ${input.celebrityFetched}
      LIMIT ${input.candidateTake}
    ),
    fallback AS (
      SELECT
        p.post_id AS id,
        p.author_id AS "authorId",
        p.created_at AS "createdAt",
        'fallback'::text AS source,
        NULL::int AS "redisIndex"
      FROM posts p
      WHERE ${visibleWhere}
        AND p.author_id = ANY(${followingArray})
      ORDER BY p.created_at DESC
      OFFSET ${input.followedFetched}
      LIMIT ${input.candidateTake}
    ),
    rest AS (
      SELECT
        p.post_id AS id,
        p.author_id AS "authorId",
        p.created_at AS "createdAt",
        'rest'::text AS source,
        NULL::int AS "redisIndex"
      FROM posts p
      WHERE ${visibleWhere}
        AND NOT (p.author_id = ANY(${followingArray}))
      ORDER BY p.created_at DESC
      OFFSET ${input.restFetched}
      LIMIT ${input.candidateTake}
    )
    SELECT * FROM freshness
    UNION ALL SELECT * FROM redis
    UNION ALL SELECT * FROM celebrity
    UNION ALL SELECT * FROM fallback
    UNION ALL SELECT * FROM rest
  `);

  return splitHybridCandidateRows(rows);
}

export async function getFeedPosts(
  viewerId: string | null,
  cursor: FeedCursor,
  pageSize: number,
  options: {
    joinedCommunityIds?: Awaited<ReturnType<typeof getJoinedCommunityIds>>;
  } = {},
): Promise<FeedPage> {
  const [hiddenIds, joinedCommunityIds, followingIds, config] = await Promise.all([
    getHiddenPostIds(viewerId),
    options.joinedCommunityIds ?? getJoinedCommunityIds(viewerId),
    viewerId ? getFollowingIds(viewerId) : Promise.resolve<string[]>([]),
    getFeedFanoutConfig(),
  ]);
  const baseWhere = buildCommunityFeedWhere({
    viewerId,
    ...joinedCommunityIds,
    hiddenIds,
  });
  const followingSet = new Set(followingIds);
  const noFollowing = followingIds.length === 0;
  const freshnessQuota = Math.min(
    pageSize,
    Math.ceil(pageSize * config.freshnessOverlayRatio),
  );

  if (viewerId && noFollowing) {
    const posts = (await prisma.post.findMany({
      where: baseWhere,
      include: buildPostInclude(viewerId),
      orderBy: { createdAt: "desc" },
      skip: cursor.restFetched ?? 0,
      take: pageSize,
    })) as RawFeedPost[];
    const postIds = posts.map((post) => post.id);
    const [pollMap, permissionsMap] = await Promise.all([
      getPollsForPosts(postIds, viewerId),
      viewerId
        ? resolveDeleteRolesBatch(
            viewerId,
            posts.map((post) => ({
              postId: post.id,
              authorId: post.authorId,
              clubId: post.clubId,
              groupId: post.groupId,
            })),
          )
        : Promise.resolve(new Map<string, DeleteRole | null>()),
    ]);

    return {
      posts: posts.map((post) =>
        mapRawPost(
          post,
          false,
          pollMap.get(post.id) ?? null,
          buildFeedPermissions(post, viewerId, permissionsMap.get(post.id) ?? null),
        ),
      ),
      nextCursor: {
        ...cursor,
        restFetched: (cursor.restFetched ?? 0) + posts.length,
        followedExhausted: true,
      },
      hasMore: posts.length >= pageSize,
    };
  }

  let redisFetched = cursor.redisFetched ?? 0;
  let celebrityFetched = cursor.celebrityFetched ?? 0;
  let freshnessFetched = cursor.freshnessFetched ?? 0;
  let followedFetched = cursor.followedFetched ?? 0;
  let restFetched = cursor.restFetched ?? 0;
  let followedExhausted = cursor.followedExhausted || !viewerId || noFollowing;

  const selected: SelectedFeedCandidate[] = [];
  const seenIds = new Set<string>();
  let redisCandidates: RedisFeedCandidatePost[] = [];
  let celebrityCandidates: FeedCandidatePost[] = [];
  let personalizedIdCount = 0;
  const useHybridCandidateQuery = Boolean(viewerId && followingIds.length > 0);
  const hybridCandidateBuckets = useHybridCandidateQuery
    ? await (async () => {
        const personalizedIds = await getPersonalizedFeedPostIds(
          viewerId!,
          redisFetched,
          config.redisReadCandidateLimit,
        );
        personalizedIdCount = personalizedIds.length;
        const celebrityAuthorIds = await getCelebrityAuthorIds();
        const followedCelebrityIds = celebrityAuthorIds.filter((authorId) =>
          followingSet.has(authorId),
        );

        return getHybridCandidateBuckets({
          viewerId: viewerId!,
          joinedCommunityIds,
          hiddenIds,
          followingIds,
          followedCelebrityIds,
          personalizedIds,
          freshnessSince: new Date(
            Date.now() - config.freshnessWindowMinutes * 60 * 1000,
          ),
          freshnessFetched,
          freshnessQuota,
          redisFetched,
          celebrityFetched,
          followedFetched,
          restFetched,
          candidateTake: Math.max(1, pageSize * 3),
        });
      })()
    : null;

  const freshnessCandidates = hybridCandidateBuckets?.freshness ??
    ((await prisma.post.findMany({
      where: {
        ...baseWhere,
        createdAt: {
          gte: new Date(Date.now() - config.freshnessWindowMinutes * 60 * 1000),
        },
      },
      select: candidateSelect,
      orderBy: { createdAt: "desc" },
      skip: freshnessFetched,
      take: Math.max(freshnessQuota, 0),
    })) as FeedCandidatePost[]);
  consumeCandidates(
    selected,
    seenIds,
    freshnessCandidates.map((post) =>
      toSelectedFeedCandidate(
        post,
        "freshness",
        followingSet.has(post.authorId),
      ),
    ),
    pageSize,
  );
  freshnessFetched += freshnessCandidates.length;

  if (viewerId) {
    if (hybridCandidateBuckets) {
      redisCandidates = hybridCandidateBuckets.redis;
    } else {
      const personalizedIds = await getPersonalizedFeedPostIds(
        viewerId,
        redisFetched,
        config.redisReadCandidateLimit,
      );
      personalizedIdCount = personalizedIds.length;

      if (personalizedIds.length > 0) {
        const rows = (await prisma.post.findMany({
          where: buildIdWhere(personalizedIds, baseWhere),
          select: candidateSelect,
          orderBy: { createdAt: "desc" },
        })) as FeedCandidatePost[];

        const rowsById = new Map(rows.map((post) => [post.id, post]));
        redisCandidates = personalizedIds.flatMap((postId, redisIndex) => {
          const post = rowsById.get(postId);
          if (!post) return [];
          if (post.authorId !== viewerId && !followingSet.has(post.authorId)) {
            return [];
          }
          return [{ ...post, redisIndex }];
        });
      }
    }

    if (followingIds.length > 0) {
      if (hybridCandidateBuckets) {
        celebrityCandidates = hybridCandidateBuckets.celebrity;
      } else {
        const celebrityAuthorIds = await getCelebrityAuthorIds();
        const followedCelebrityIds = celebrityAuthorIds.filter((authorId) =>
          followingSet.has(authorId),
        );

        if (followedCelebrityIds.length > 0) {
          celebrityCandidates = (await prisma.post.findMany({
            where: {
              ...baseWhere,
              authorId: { in: followedCelebrityIds },
            },
            select: candidateSelect,
            orderBy: { createdAt: "desc" },
            skip: celebrityFetched,
            take: config.celebrityReadCandidateLimit,
          })) as FeedCandidatePost[];
        }
      }
    }
  }

  const followedCandidates: SelectedFeedCandidate[] = [
    ...redisCandidates.map((post) => ({
      ...post,
      isFromFollowed: followingSet.has(post.authorId),
      source: "redis" as const,
    })),
    ...celebrityCandidates.map((post) =>
      toSelectedFeedCandidate(
        post,
        "celebrity",
        followingSet.has(post.authorId),
      ),
    ),
  ].sort(byCreatedAtDesc);

  const followedConsumption = consumeCandidates(
    selected,
    seenIds,
    followedCandidates,
    pageSize,
  );
  if (personalizedIdCount > 0) {
    redisFetched += getRedisCursorAdvance({
      personalizedIdCount,
      redisCandidates,
      consumedRedisIndexes: followedConsumption.consumedRedisIndexes,
      seenIds,
    });
  }
  celebrityFetched += getSeenPrefixCount(celebrityCandidates, seenIds);

  const selectedHasFollowedOverlap = selected.some(
    (post) => post.isFromFollowed,
  );

  if (
    viewerId &&
    followingIds.length > 0 &&
    !followedExhausted &&
    (selected.length < pageSize || selectedHasFollowedOverlap)
  ) {
    const remainingSlots = Math.max(pageSize - selected.length, 0);
    const fallbackTake = Math.max(1, getOverreadTake(
      remainingSlots,
      freshnessQuota,
      followedCandidates.length,
      pageSize,
    ));
    const fallbackFollowedCandidates = hybridCandidateBuckets?.fallback ??
      ((await prisma.post.findMany({
        where: {
          ...baseWhere,
          authorId: { in: followingIds },
        },
        select: candidateSelect,
        orderBy: { createdAt: "desc" },
        skip: followedFetched,
        take: fallbackTake,
      })) as FeedCandidatePost[]);

    const fallbackConsumption = consumeCandidates(
      selected,
      seenIds,
      fallbackFollowedCandidates.map((post) =>
        toSelectedFeedCandidate(
          post,
          "fallback",
          followingSet.has(post.authorId),
        ),
      ),
      pageSize,
    );
    followedFetched += fallbackConsumption.consumed;

    if (
      fallbackConsumption.consumed === fallbackFollowedCandidates.length &&
      fallbackFollowedCandidates.length < fallbackTake
    ) {
      followedExhausted = true;
    }
  }

  const selectedHasRestOverlap =
    followingIds.length > 0
      ? selected.some((post) => !post.isFromFollowed)
      : selected.length > 0;

  if (selected.length < pageSize || selectedHasRestOverlap) {
    const remainingSlots = Math.max(pageSize - selected.length, 0);
    const restTake = Math.max(1, getOverreadTake(
      remainingSlots,
      freshnessQuota,
      followedCandidates.length,
      pageSize,
    ));
    const restCandidates = hybridCandidateBuckets?.rest ??
      ((await prisma.post.findMany({
        where: {
          ...baseWhere,
          ...(followingIds.length > 0
            ? { authorId: { notIn: followingIds } }
            : {}),
        },
        select: candidateSelect,
        orderBy: { createdAt: "desc" },
        skip: restFetched,
        take: restTake,
      })) as FeedCandidatePost[]);

    const restConsumption = consumeCandidates(
      selected,
      seenIds,
      restCandidates.map((post) =>
        toSelectedFeedCandidate(post, "rest", false),
      ),
      pageSize,
    );
    restFetched += restConsumption.consumed;
  }

  const selectedIds = selected.map((post) => post.id);
  const selectedById = new Map(
    selected.map((post) => [post.id, post] as const),
  );
  const preloadedPostById = new Map(
    selected
      .map((candidate) => candidate.post)
      .filter((post): post is RawFeedPost => Boolean(post))
      .map((post) => [post.id, post] as const),
  );
  const missingSelectedIds = selectedIds.filter(
    (postId) => !preloadedPostById.has(postId),
  );
  const hydratedPosts =
    missingSelectedIds.length > 0
      ? ((await prisma.post.findMany({
          where: buildIdWhere(missingSelectedIds, baseWhere),
          include: buildPostInclude(viewerId),
        })) as RawFeedPost[])
      : [];
  const hydratedPostById = new Map(
    hydratedPosts.map((post) => [post.id, post] as const),
  );
  const orderedFullPosts = selectedIds
    .map((id) => preloadedPostById.get(id) ?? hydratedPostById.get(id))
    .filter((post): post is RawFeedPost => Boolean(post));
  const [pollMap, permissionsMap] = await Promise.all([
    getPollsForPosts(selectedIds, viewerId),
    viewerId
      ? resolveDeleteRolesBatch(
          viewerId,
          orderedFullPosts.map((post) => ({
            postId: post.id,
            authorId: post.authorId,
            clubId: post.clubId,
            groupId: post.groupId,
          })),
        )
      : Promise.resolve(new Map<string, DeleteRole | null>()),
  ]);

  const posts = orderedFullPosts.map((post) =>
    mapRawPost(
      post,
      selectedById.get(post.id)?.isFromFollowed ?? false,
      pollMap.get(post.id) ?? null,
      buildFeedPermissions(post, viewerId, permissionsMap.get(post.id) ?? null),
    ),
  );

  const totalReturned = posts.length;
  const hasMore = totalReturned >= pageSize;

  return {
    posts,
    nextCursor: {
      redisFetched,
      celebrityFetched,
      freshnessFetched,
      followedFetched,
      restFetched,
      followedExhausted,
    },
    hasMore,
  };
}
