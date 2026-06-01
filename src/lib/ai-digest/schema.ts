import { z } from "zod"

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const dateTimeSchema = z.string().datetime({ offset: true })

export const digestRangeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("preset"),
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  }).strict(),
  z.object({
    type: z.literal("custom"),
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,
  }).strict(),
])

export const digestRequestSchema = z.object({
  range: digestRangeSchema,
  includeSeen: z.boolean().default(false),
}).strict()

const providerDigestReferenceSchema = z.object({
  announcementId: z.string().min(1),
  summary: z.string().trim().min(1).max(600),
}).strict()

export const providerDigestSchema = z.object({
  overview: z.string().trim().min(1).max(1500),
  actionItems: z.array(providerDigestReferenceSchema).max(20),
  expiringSoon: z.array(providerDigestReferenceSchema).max(20),
  announcements: z.array(providerDigestReferenceSchema).max(50),
}).strict()

export const DIGEST_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["overview", "actionItems", "expiringSoon", "announcements"],
  properties: {
    overview: { type: "string", minLength: 1, maxLength: 1500 },
    actionItems: {
      type: "array",
      maxItems: 20,
      items: { $ref: "#/$defs/reference" },
    },
    expiringSoon: {
      type: "array",
      maxItems: 20,
      items: { $ref: "#/$defs/reference" },
    },
    announcements: {
      type: "array",
      maxItems: 50,
      items: { $ref: "#/$defs/reference" },
    },
  },
  $defs: {
    reference: {
      type: "object",
      additionalProperties: false,
      required: ["announcementId", "summary"],
      properties: {
        announcementId: { type: "string", minLength: 1 },
        summary: { type: "string", minLength: 1, maxLength: 600 },
      },
    },
  },
} as const

export const digestSourceItemSchema = z.object({
  announcementId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().trim().min(1).max(600),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  status: z.enum(["PUBLISHED", "WITHDRAWN", "SUPERSEDED"]),
  publishedAt: dateTimeSchema,
  actionDeadlineAt: dateTimeSchema.nullable(),
  sourceHref: z.string().startsWith("/feed?announcement="),
  replacementHref: z.string().startsWith("/feed?announcement=").nullable(),
}).strict()

const digestCoverageSchema = z.object({
  eligibleCount: z.number().int().nonnegative(),
  includedCount: z.number().int().nonnegative(),
  omittedCount: z.number().int().nonnegative(),
}).strict()

export const announcementDigestDtoSchema = z.object({
  overview: z.string().trim().min(1).max(1500),
  actionItems: z.array(digestSourceItemSchema).max(20),
  expiringSoon: z.array(digestSourceItemSchema).max(20),
  announcements: z.array(digestSourceItemSchema).max(50),
  coverage: digestCoverageSchema,
  generatedAt: dateTimeSchema,
  cached: z.boolean(),
}).strict()

export type DigestRequest = z.infer<typeof digestRequestSchema>
export type DigestRange = z.infer<typeof digestRangeSchema>
export type ProviderDigest = z.infer<typeof providerDigestSchema>
export type DigestSourceItem = z.infer<typeof digestSourceItemSchema>
export type DigestCoverage = z.infer<typeof digestCoverageSchema>
export type AnnouncementDigestDto = z.infer<typeof announcementDigestDtoSchema>
