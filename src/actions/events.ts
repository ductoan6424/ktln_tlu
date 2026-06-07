"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getAuthorizationContext, requireAdminPermission } from "@/lib/auth/authorization"
import { getEventAdminSettings } from "@/lib/admin/settings/admin-settings-queries"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"
import { errorResult, successResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import { eventInputSchema } from "@/utils/validators"

type EventInput = z.infer<typeof eventInputSchema>

const eventIdSchema = z.string().min(1)
const updateEventSchema = eventInputSchema.extend({ id: z.string().min(1) })

function normalizeBoolean(value: FormDataEntryValue | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value
  return value === "true" || value === "on"
}

function normalizeCapacity(value: FormDataEntryValue | number | null | undefined): number | null {
  if (typeof value === "number") return value
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeInput(rawInput: unknown): EventInput | null {
  if (rawInput instanceof FormData) {
    return {
      title: String(rawInput.get("title") ?? "").trim(),
      description: String(rawInput.get("description") ?? "").trim(),
      type: String(rawInput.get("type") ?? "OTHER") as EventInput["type"],
      location: String(rawInput.get("location") ?? "").trim(),
      organizerName: String(rawInput.get("organizerName") ?? "").trim(),
      startAt: String(rawInput.get("startAt") ?? ""),
      endAt: String(rawInput.get("endAt") ?? ""),
      capacity: normalizeCapacity(rawInput.get("capacity")),
      registrationStatus: String(rawInput.get("registrationStatus") ?? "OPEN") as EventInput["registrationStatus"],
      featured: normalizeBoolean(rawInput.get("featured")),
      coverImageUrl: String(rawInput.get("coverImageUrl") ?? "").trim(),
    }
  }

  if (rawInput && typeof rawInput === "object") {
    return rawInput as EventInput
  }

  return null
}

function toEventData(input: EventInput) {
  return {
    title: input.title,
    description: input.description,
    type: input.type,
    location: input.location,
    organizerName: input.organizerName,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    capacity: input.capacity ?? null,
    registrationStatus: input.registrationStatus,
    featured: input.featured,
    coverImageUrl: input.coverImageUrl || null,
  }
}

function revalidateEventSurfaces(eventId?: string) {
  revalidatePath("/admin/events")
  revalidatePath("/events")
  revalidatePath("/feed")
  if (eventId) {
    revalidatePath(`/admin/events/${eventId}`)
    revalidatePath(`/admin/events/${eventId}/edit`)
  }
}

function validationError<T>(error: z.ZodError): ActionResult<T> {
  return errorResult(error.issues[0]?.message ?? "Dữ liệu sự kiện không hợp lệ", "VALIDATION_ERROR")
}

export async function createEvent(
  rawInput: unknown,
  options: { publish?: boolean } = {},
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const actor = await requireAdminPermission("admin.events.manage")
    const normalized = normalizeInput(rawInput)
    if (!normalized) return errorResult("Dữ liệu sự kiện không hợp lệ", "VALIDATION_ERROR")

    const parsed = eventInputSchema.safeParse(normalized)
    if (!parsed.success) return validationError(parsed.error)

    const publish = Boolean(options.publish)
    const event = await prisma.event.create({
      data: {
        ...toEventData(parsed.data),
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
        createdById: actor.profile.userId,
      },
      select: { id: true, status: true },
    })

    revalidateEventSurfaces(event.id)
    return successResult({ id: event.id, status: event.status })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể tạo sự kiện. Vui lòng thử lại.")
  }
}

export async function updateEvent(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminPermission("admin.events.manage")
    const input = rawInput instanceof FormData
      ? { ...normalizeInput(rawInput), id: String(rawInput.get("id") ?? "") }
      : rawInput
    const parsed = updateEventSchema.safeParse(input)
    if (!parsed.success) return validationError(parsed.error)

    const existing = await prisma.event.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, deletedAt: true },
    })
    if (!existing || existing.deletedAt) {
      return errorResult("Sự kiện không tồn tại.", "NOT_FOUND")
    }

    await prisma.event.update({
      where: { id: parsed.data.id },
      data: toEventData(parsed.data),
    })

    revalidateEventSurfaces(parsed.data.id)
    return successResult({ id: parsed.data.id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return validationError(error)
    return errorResult("Không thể cập nhật sự kiện.")
  }
}

export async function publishEvent(eventId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminPermission("admin.events.manage")
    const id = eventIdSchema.parse(eventId)
    await prisma.event.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date(), cancelledAt: null },
    })
    revalidateEventSurfaces(id)
    return successResult({ id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return errorResult("Mã sự kiện không hợp lệ", "VALIDATION_ERROR")
    return errorResult("Không thể đăng sự kiện.")
  }
}

export async function cancelEvent(eventId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminPermission("admin.events.manage")
    const id = eventIdSchema.parse(eventId)
    await prisma.event.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    })
    revalidateEventSurfaces(id)
    return successResult({ id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return errorResult("Mã sự kiện không hợp lệ", "VALIDATION_ERROR")
    return errorResult("Không thể hủy sự kiện.")
  }
}

export async function deleteEvent(eventId: string): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdminPermission("admin.events.manage")
    const id = eventIdSchema.parse(eventId)
    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    revalidateEventSurfaces(id)
    return successResult({ id })
  } catch (error) {
    if (error instanceof AppError) return errorResult(error.message, error.code)
    if (error instanceof z.ZodError) return errorResult("Mã sự kiện không hợp lệ", "VALIDATION_ERROR")
    return errorResult("Không thể xoá sự kiện.")
  }
}

export async function registerForEvent(eventId: string): Promise<ActionResult<{
  eventId: string
  registered: boolean
}>> {
  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập để tham gia sự kiện", "UNAUTHORIZED")

    const id = eventIdSchema.parse(eventId)
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        registrationStatus: true,
        capacity: true,
        startAt: true,
        deletedAt: true,
        _count: {
          select: {
            registrations: { where: { status: "REGISTERED" } },
          },
        },
      },
    })

    if (!event || event.deletedAt || event.status !== "PUBLISHED") {
      return errorResult("Sự kiện không tồn tại hoặc chưa được mở.", "NOT_FOUND")
    }
    if (event.registrationStatus !== "OPEN") {
      return errorResult("Sự kiện hiện không mở đăng ký.", "REGISTRATION_CLOSED")
    }
    if (event.startAt.getTime() <= Date.now()) {
      return errorResult("Sự kiện đã bắt đầu, không thể đăng ký thêm.", "REGISTRATION_CLOSED")
    }
    if (event.capacity !== null && event._count.registrations >= event.capacity) {
      return errorResult("Sự kiện đã đủ số lượng tham gia.", "EVENT_FULL")
    }

    await prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId: id, userId: context.profile.userId } },
      update: { status: "REGISTERED", cancelledAt: null },
      create: { eventId: id, userId: context.profile.userId, status: "REGISTERED" },
    })

    revalidatePath("/events")
    revalidatePath("/feed")
    return successResult({ eventId: id, registered: true })
  } catch (error) {
    if (error instanceof z.ZodError) return errorResult("Mã sự kiện không hợp lệ", "VALIDATION_ERROR")
    return errorResult("Không thể đăng ký sự kiện.")
  }
}

export async function cancelEventRegistration(eventId: string): Promise<ActionResult<{
  eventId: string
  registered: boolean
}>> {
  try {
    const context = await getAuthorizationContext()
    if (!context) return errorResult("Bạn cần đăng nhập để hủy đăng ký", "UNAUTHORIZED")
    const settings = await getEventAdminSettings()
    if (!settings.allowSelfCancellation) {
      return errorResult("Sự kiện hiện không cho phép tự hủy đăng ký.", "REGISTRATION_CANCEL_DISABLED")
    }

    const id = eventIdSchema.parse(eventId)
    await prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId: id, userId: context.profile.userId } },
      update: { status: "CANCELLED", cancelledAt: new Date() },
      create: {
        eventId: id,
        userId: context.profile.userId,
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    })

    revalidatePath("/events")
    revalidatePath("/feed")
    return successResult({ eventId: id, registered: false })
  } catch (error) {
    if (error instanceof z.ZodError) return errorResult("Mã sự kiện không hợp lệ", "VALIDATION_ERROR")
    return errorResult("Không thể hủy đăng ký sự kiện.")
  }
}
