import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { formatRelativeTime } from "@/utils/formatters";
import { canHidePost, resolveDeleteRole } from "@/lib/auth/post-permissions";
import { getPollsForPosts } from "@/lib/polls/queries";
import type { PollView } from "@/lib/polls/types";
import { getFeedFanoutConfig } from "@/lib/feed/config";
import {
  getCelebrityAuthorIds,
  getPersonalizedFeedPostIds,
} from "@/lib/feed/fanout";

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
  isLiked: boolean;
  likes: number;
  comments: number;
  isFromFollowed: boolean;
  permissions: FeedPostPermissions;
  sharedPost: FeedSharedPost | null;
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

type RawFeedPost = Prisma.PostGetPayload<{
  include: {
    author: { select: { displayName: true; avatarUrl: true } };
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
  };
}>;

type FeedCandidatePost = {
  id: string;
  authorId: string;
  createdAt: Date;
};

type RedisFeedCandidatePost = FeedCandidatePost & {
  redisIndex: number;
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
};

type CandidateSourceCounts = Record<FeedCandidateSource, number>;

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
      },
    },
    likes: viewerId
      ? { where: { userId: viewerId }, select: { id: true } }
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
  } as const;
}

async function mapRawPost(
  post: RawFeedPost,
  viewerId: string | null,
  isFromFollowed: boolean,
  poll: PollView | null,
): Promise<FeedPostDto> {
  let permissions: FeedPostPermissions = {
    canDelete: false,
    canHide: false,
    deleteRole: null,
  };

  if (viewerId) {
    const ctx = {
      postId: post.id,
      authorId: post.authorId,
      clubId: post.clubId,
      groupId: post.groupId,
    };
    const role = await resolveDeleteRole(viewerId, ctx);
    permissions = {
      canDelete: role !== null,
      canHide: canHidePost(viewerId, ctx),
      deleteRole:
        role === "AUTHOR" ? "AUTHOR" : role !== null ? "MODERATOR" : null,
    };
  }

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
    isLiked: likesArr.length > 0,
    likes: post._count.likes,
    comments: post._count.comments,
    isFromFollowed,
    permissions,
    sharedPost,
    poll,
  };
}

function buildBaseWhere(hiddenIds: string[]): Prisma.PostWhereInput {
  return {
    visibility: "PUBLIC",
    deletedAt: null,
    ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
  };
}

function buildIdWhere(
  ids: string[],
  hiddenIds: string[],
): Prisma.PostWhereInput {
  return {
    visibility: "PUBLIC",
    deletedAt: null,
    id: {
      in: ids,
      ...(hiddenIds.length > 0 ? { notIn: hiddenIds } : {}),
    },
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

function consumeCandidates(
  target: SelectedFeedCandidate[],
  seenIds: Set<string>,
  candidates: SelectedFeedCandidate[],
  limit: number,
): {
  consumed: number;
  selectedCount: number;
  sourceCounts: CandidateSourceCounts;
  maxRedisIndex: number | null;
} {
  let consumed = 0;
  let selectedCount = 0;
  let maxRedisIndex: number | null = null;
  const sourceCounts = createCandidateSourceCounts();

  for (const candidate of candidates) {
    if (target.length >= limit) break;
    consumed += 1;
    sourceCounts[candidate.source] += 1;
    if (candidate.source === "redis" && candidate.redisIndex !== undefined) {
      maxRedisIndex =
        maxRedisIndex === null
          ? candidate.redisIndex
          : Math.max(maxRedisIndex, candidate.redisIndex);
    }
    if (seenIds.has(candidate.id)) continue;
    seenIds.add(candidate.id);
    target.push(candidate);
    selectedCount += 1;
  }

  return { consumed, selectedCount, sourceCounts, maxRedisIndex };
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

export async function getFeedPosts(
  viewerId: string | null,
  cursor: FeedCursor,
  pageSize: number,
): Promise<FeedPage> {
  const hiddenIds = await getHiddenPostIds(viewerId);
  const followingIds = viewerId ? await getFollowingIds(viewerId) : [];
  const config = await getFeedFanoutConfig();
  const baseWhere = buildBaseWhere(hiddenIds);
  const followingSet = new Set(followingIds);
  const noFollowing = followingIds.length === 0;
  const freshnessQuota = Math.min(
    pageSize,
    Math.ceil(pageSize * config.freshnessOverlayRatio),
  );

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

  const freshnessCandidates = (await prisma.post.findMany({
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
  })) as FeedCandidatePost[];
  consumeCandidates(
    selected,
    seenIds,
    freshnessCandidates.map((post) => ({
      ...post,
      isFromFollowed: followingSet.has(post.authorId),
      source: "freshness",
    })),
    pageSize,
  );
  freshnessFetched += freshnessCandidates.length;

  if (viewerId && selected.length < pageSize) {
    const personalizedIds = await getPersonalizedFeedPostIds(
      viewerId,
      redisFetched,
      config.redisReadCandidateLimit,
    );
    personalizedIdCount = personalizedIds.length;

    if (personalizedIds.length > 0) {
      const rows = (await prisma.post.findMany({
        where: buildIdWhere(personalizedIds, hiddenIds),
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

    if (followingIds.length > 0 && selected.length < pageSize) {
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

  const followedCandidates = [
    ...redisCandidates.map((post) => ({ ...post, source: "redis" as const })),
    ...celebrityCandidates.map((post) => ({
      ...post,
      source: "celebrity" as const,
    })),
  ].sort(byCreatedAtDesc);

  const followedConsumption = consumeCandidates(
    selected,
    seenIds,
    followedCandidates.map((post) => ({
      ...post,
      isFromFollowed: followingSet.has(post.authorId),
    })),
    pageSize,
  );
  if (personalizedIdCount > 0) {
    const firstValidRedisIndex = redisCandidates[0]?.redisIndex;
    if (
      redisCandidates.length === 0 ||
      followedConsumption.sourceCounts.redis === redisCandidates.length
    ) {
      redisFetched += personalizedIdCount;
    } else if (followedConsumption.maxRedisIndex !== null) {
      redisFetched += followedConsumption.maxRedisIndex + 1;
    } else if (firstValidRedisIndex !== undefined) {
      redisFetched += firstValidRedisIndex;
    }
  }
  celebrityFetched += followedConsumption.sourceCounts.celebrity;

  if (
    viewerId &&
    followingIds.length > 0 &&
    redisCandidates.length === 0 &&
    celebrityCandidates.length === 0 &&
    !followedExhausted &&
    selected.length < pageSize
  ) {
    const remainingSlots = pageSize - selected.length;
    const fallbackTake = getOverreadTake(
      remainingSlots,
      freshnessQuota,
      followedCandidates.length,
      pageSize,
    );
    const fallbackFollowedCandidates = (await prisma.post.findMany({
      where: {
        ...baseWhere,
        authorId: { in: followingIds },
      },
      select: candidateSelect,
      orderBy: { createdAt: "desc" },
      skip: followedFetched,
      take: fallbackTake,
    })) as FeedCandidatePost[];

    const fallbackConsumption = consumeCandidates(
      selected,
      seenIds,
      fallbackFollowedCandidates.map((post) => ({
        ...post,
        isFromFollowed: followingSet.has(post.authorId),
        source: "fallback",
      })),
      pageSize,
    );
    followedFetched += fallbackConsumption.consumed;

    if (fallbackFollowedCandidates.length < fallbackTake) {
      followedExhausted = true;
    }
  }

  if (selected.length < pageSize) {
    const remainingSlots = pageSize - selected.length;
    const restTake = getOverreadTake(
      remainingSlots,
      freshnessQuota,
      followedCandidates.length,
      pageSize,
    );
    const restCandidates = (await prisma.post.findMany({
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
    })) as FeedCandidatePost[];

    const restConsumption = consumeCandidates(
      selected,
      seenIds,
      restCandidates.map((post) => ({
        ...post,
        isFromFollowed: false,
        source: "rest",
      })),
      pageSize,
    );
    restFetched += restConsumption.consumed;
  }

  const selectedIds = selected.map((post) => post.id);
  const selectedById = new Map(
    selected.map((post) => [post.id, post] as const),
  );
  const fullPosts =
    selectedIds.length > 0
      ? ((await prisma.post.findMany({
          where: buildIdWhere(selectedIds, hiddenIds),
          include: buildPostInclude(viewerId),
        })) as RawFeedPost[])
      : [];
  const fullPostById = new Map(fullPosts.map((post) => [post.id, post]));
  const orderedFullPosts = selectedIds
    .map((id) => fullPostById.get(id))
    .filter((post): post is RawFeedPost => Boolean(post));
  const pollMap = await getPollsForPosts(selectedIds, viewerId);

  const posts = await Promise.all(
    orderedFullPosts.map((post) =>
      mapRawPost(
        post,
        viewerId,
        selectedById.get(post.id)?.isFromFollowed ?? false,
        pollMap.get(post.id) ?? null,
      ),
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
