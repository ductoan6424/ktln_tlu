import type { AnnouncementTargetInput } from "@/lib/announcements/targeting"
import { normalizeAnnouncementTargets } from "@/lib/announcements/targeting"
import { prisma } from "@/lib/prisma/client"

type ReferenceRow = Record<string, string>

type ReferenceReader = {
  findMany: (args: {
    where: Record<string, unknown>
    select: Record<string, boolean>
  }) => Promise<ReferenceRow[]>
}

type AnnouncementTargetReferenceDb = {
  faculty: ReferenceReader
  course: ReferenceReader
  club: ReferenceReader
  group: ReferenceReader
  userProfile: ReferenceReader
}

const REFERENCE_CONFIG = {
  FACULTY: {
    delegate: "faculty",
    field: "id",
    message: "Khoa nhận thông báo không tồn tại.",
  },
  COURSE: {
    delegate: "course",
    field: "id",
    message: "Lớp học phần nhận thông báo không tồn tại.",
  },
  CLUB: {
    delegate: "club",
    field: "id",
    message: "CLB nhận thông báo không tồn tại.",
  },
  GROUP: {
    delegate: "group",
    field: "id",
    message: "Nhóm nhận thông báo không tồn tại.",
  },
  USER: {
    delegate: "userProfile",
    field: "userId",
    message: "Người nhận riêng không tồn tại.",
  },
} as const

function uniqueValues(targets: AnnouncementTargetInput[], type: AnnouncementTargetInput["type"]) {
  return Array.from(
    new Set(
      targets
        .filter((target) => target.type === type)
        .map((target) => target.value)
        .filter(Boolean),
    ),
  )
}

async function hasAllReferences(
  reader: ReferenceReader,
  field: string,
  values: string[],
) {
  if (values.length === 0) return true

  const rows = await reader.findMany({
    where: { [field]: { in: values } },
    select: { [field]: true },
  })
  const existing = new Set(rows.map((row) => row[field]).filter(Boolean))

  return values.every((value) => existing.has(value))
}

export async function validateAnnouncementTargetReferences(
  targets: AnnouncementTargetInput[],
  db: AnnouncementTargetReferenceDb = prisma as unknown as AnnouncementTargetReferenceDb,
): Promise<string | null> {
  const normalized = normalizeAnnouncementTargets(targets)

  for (const [type, config] of Object.entries(REFERENCE_CONFIG)) {
    const values = uniqueValues(normalized, type as AnnouncementTargetInput["type"])
    const reader = db[config.delegate]
    const isValid = await hasAllReferences(reader, config.field, values)
    if (!isValid) return config.message
  }

  return null
}
