import type { CommunityType } from "@/lib/communities/types"

const ROUTE_SEGMENTS: Record<CommunityType, string> = {
  GROUP: "groups",
  CLUB: "clubs",
  COURSE: "courses",
}

export function slugifyCommunityName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function extractShortIdFromSlugId(slugId: string) {
  const parts = slugId.split("-").filter(Boolean)
  return parts.at(-1) ?? ""
}

export function buildCommunityPath(
  type: CommunityType,
  name: string,
  shortId: string,
  suffix?: "manage",
) {
  const slug = slugifyCommunityName(name) || "community"
  const base = `/${ROUTE_SEGMENTS[type]}/${slug}-${shortId}`
  return suffix ? `${base}/${suffix}` : base
}
