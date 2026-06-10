"use server"

import { z } from "zod"

import { requireAuth } from "@/lib/auth/authorization"
import { DigestRangeValidationError } from "@/lib/ai-digest/date-range"
import { AiDigestError } from "@/lib/ai-digest/redis"
import {
  digestRequestSchema,
  type AnnouncementDigestDto,
} from "@/lib/ai-digest/schema"
import { generateAnnouncementDigest } from "@/lib/ai-digest/service"
import { AppError } from "@/lib/errors"
import { errorResult, successResult, type ActionResult } from "@/types/api"

function redactDiagnosticText(value: string) {
  return value
    .replace(/\b(?:redis|rediss|postgres(?:ql)?|mysql):\/\/\S+/gi, "[redacted-url]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted-key]")
}

function summarizeAnnouncementDigestActionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      name: error.name,
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactDiagnosticText(error.message),
    }
  }

  return { value: redactDiagnosticText(String(error)) }
}

export async function createAnnouncementDigest(
  rawInput: unknown,
): Promise<ActionResult<AnnouncementDigestDto>> {
  try {
    const user = await requireAuth()
    const request = digestRequestSchema.parse(rawInput)
    const dto = await generateAnnouncementDigest({ userId: user.id, request })

    return successResult(dto)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResult("Bo loc tom tat khong hop le.", "VALIDATION_ERROR")
    }

    if (error instanceof DigestRangeValidationError) {
      return errorResult(error.message, "VALIDATION_ERROR")
    }

    if (error instanceof AiDigestError) {
      return errorResult(error.message, error.code)
    }

    if (error instanceof AppError) {
      return errorResult(error.message, error.code)
    }

    console.error(
      "Failed to create announcement AI digest",
      summarizeAnnouncementDigestActionError(error),
    )
    return errorResult("Tinh nang AI tam thoi chua kha dung.", "UNAVAILABLE")
  }
}
