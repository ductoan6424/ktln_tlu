"use server"

import { z } from "zod"

import { requireAdminAccess } from "@/lib/auth/authorization"
import { prisma } from "@/lib/prisma/client"
import { successResult, errorResult, type ActionResult } from "@/types/api"

export type AdminSearchResult = {
  id: string
  type: string
  title: string
  description: string
  href: string
}

const searchSchema = z.object({
  query: z.string().trim().min(1).max(100),
})

function result(input: AdminSearchResult): AdminSearchResult {
  return input
}

export async function searchAdmin(rawInput: unknown): Promise<ActionResult<AdminSearchResult[]>> {
  try {
    await requireAdminAccess()
    const parsed = searchSchema.safeParse(rawInput)
    if (!parsed.success) return successResult([])

    const query = parsed.data.query
    const [users, courses, clubs, groups, events, announcements] = await Promise.all([
      prisma.userProfile.findMany({
        where: {
          deletedAt: null,
          OR: [
            { displayName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { studentId: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { userId: true, displayName: true, email: true, role: true },
        take: 5,
      }),
      prisma.course.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, code: true, name: true },
        take: 5,
      }),
      prisma.club.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, category: true },
        take: 5,
      }),
      prisma.group.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, description: true },
        take: 5,
      }),
      prisma.event.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { organizerName: { contains: query, mode: "insensitive" } },
            { location: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, organizerName: true, status: true },
        take: 5,
      }),
      prisma.announcement.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, status: true, content: true },
        take: 5,
      }),
    ])

    return successResult([
      ...users.map((user) =>
        result({
          id: `user:${user.userId}`,
          type: "Người dùng",
          title: user.displayName,
          description: `${user.email} / ${user.role}`,
          href: `/admin/users/${user.userId}`,
        }),
      ),
      ...courses.map((course) =>
        result({
          id: `course:${course.id}`,
          type: "Lớp học",
          title: course.name,
          description: course.code,
          href: `/admin/subjects/${course.id}`,
        }),
      ),
      ...clubs.map((club) =>
        result({
          id: `club:${club.id}`,
          type: "CLB",
          title: club.name,
          description: club.category ?? "Chưa phân loại",
          href: `/admin/clubs/${club.id}`,
        }),
      ),
      ...groups.map((group) =>
        result({
          id: `group:${group.id}`,
          type: "Nhóm",
          title: group.name,
          description: group.description ?? "Nhóm học tập",
          href: `/admin/groups/${group.id}`,
        }),
      ),
      ...events.map((event) =>
        result({
          id: `event:${event.id}`,
          type: "Sự kiện",
          title: event.title,
          description: `${event.organizerName} / ${event.status}`,
          href: `/admin/events/${event.id}`,
        }),
      ),
      ...announcements.map((announcement) =>
        result({
          id: `announcement:${announcement.id}`,
          type: "Thông báo",
          title: announcement.title,
          description: announcement.content.slice(0, 120) || announcement.status,
          href: `/admin/announcements?item=${announcement.id}`,
        }),
      ),
    ].slice(0, 10))
  } catch {
    return errorResult("Không thể tìm kiếm trong admin.", "SEARCH_FAILED")
  }
}
