import { createHash } from "node:crypto"

import type { DigestCoverage } from "@/lib/ai-digest/schema"

export const AI_DIGEST_CACHE_VERSION = "1"
export const AI_DIGEST_MAX_ANNOUNCEMENTS = 50
export const DIGEST_PROMPT_TASK = "Create the announcement digest from the supplied announcements."

export type DigestSource = {
  announcementId: string
  revisionId: string
  title: string
  content: string
  priority: "NORMAL" | "IMPORTANT" | "URGENT"
  status: "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED"
  publishedAt: string
  actionDeadlineAt: string | null
  withdrawalReason: string | null
  replacementId: string | null
}

const priorityScores: Record<DigestSource["priority"], number> = {
  NORMAL: 1,
  IMPORTANT: 2,
  URGENT: 3,
}

function compareDigestSources(left: DigestSource, right: DigestSource): number {
  return (
    priorityScores[right.priority] - priorityScores[left.priority] ||
    right.publishedAt.localeCompare(left.publishedAt) ||
    left.announcementId.localeCompare(right.announcementId)
  )
}

export function projectDigestSource(source: DigestSource): DigestSource {
  return {
    announcementId: source.announcementId,
    revisionId: source.revisionId,
    title: source.title,
    content: source.content,
    priority: source.priority,
    status: source.status,
    publishedAt: source.publishedAt,
    actionDeadlineAt: source.actionDeadlineAt,
    withdrawalReason: source.withdrawalReason,
    replacementId: source.replacementId,
  }
}

export function serializeDigestPromptUser(sources: DigestSource[]): string {
  return JSON.stringify({
    task: DIGEST_PROMPT_TASK,
    announcements: sources.map(projectDigestSource),
  })
}

function serializeDigestSource(source: DigestSource): string {
  return JSON.stringify(projectDigestSource(source))
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function selectDigestSources(
  eligible: DigestSource[],
  limits: { maxAnnouncements: number; maxInputCharacters: number },
): { selected: DigestSource[]; coverage: DigestCoverage } {
  if (
    !Number.isInteger(limits.maxAnnouncements) ||
    limits.maxAnnouncements <= 0 ||
    limits.maxAnnouncements > AI_DIGEST_MAX_ANNOUNCEMENTS ||
    !Number.isInteger(limits.maxInputCharacters) ||
    limits.maxInputCharacters <= 0
  ) {
    throw new Error("AI digest selection limits must be positive integers within allowed bounds")
  }

  const selected: DigestSource[] = []

  for (const source of [...eligible].sort(compareDigestSources)) {
    if (selected.length >= limits.maxAnnouncements) {
      break
    }

    if (serializeDigestPromptUser([...selected, source]).length > limits.maxInputCharacters) {
      continue
    }

    selected.push(source)
  }

  return {
    selected,
    coverage: {
      eligibleCount: eligible.length,
      includedCount: selected.length,
      omittedCount: eligible.length - selected.length,
    },
  }
}

export function fingerprintDigestSources(eligible: DigestSource[]): string {
  return hash(eligible.map(serializeDigestSource).sort().join("\n"))
}

export function buildDigestCacheKey(input: {
  userId: string
  rangeStart: string
  rangeEnd: string
  includeSeen: boolean
  fingerprint: string
  maxAnnouncements: number
  maxInputCharacters: number
}): string {
  return `ai-digest:cache:${hash(JSON.stringify({
    cacheVersion: AI_DIGEST_CACHE_VERSION,
    userId: input.userId,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    includeSeen: input.includeSeen,
    fingerprint: input.fingerprint,
    maxAnnouncements: input.maxAnnouncements,
    maxInputCharacters: input.maxInputCharacters,
  }))}`
}
