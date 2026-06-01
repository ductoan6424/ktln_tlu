import { createHash } from "node:crypto"

import type { DigestCoverage } from "@/lib/ai-digest/schema"

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

function serializeDigestSource(source: DigestSource): string {
  return JSON.stringify({
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
  })
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
    !Number.isInteger(limits.maxInputCharacters) ||
    limits.maxInputCharacters <= 0
  ) {
    throw new Error("AI digest selection limits must be positive integers")
  }

  const selected: DigestSource[] = []
  let inputCharacters = 0

  for (const source of [...eligible].sort(compareDigestSources)) {
    if (selected.length >= limits.maxAnnouncements) {
      break
    }

    const sourceCharacters = JSON.stringify(source).length
    if (inputCharacters + sourceCharacters > limits.maxInputCharacters) {
      continue
    }

    selected.push(source)
    inputCharacters += sourceCharacters
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
}): string {
  return `ai-digest:cache:${hash(JSON.stringify({
    userId: input.userId,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    includeSeen: input.includeSeen,
    fingerprint: input.fingerprint,
  }))}`
}
