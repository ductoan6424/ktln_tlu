"use server"

import { createHash } from "crypto"

import { readSheet } from "read-excel-file/universal"

import { parseCsvRows } from "@/lib/courses/student-import"
import { requireAdminPermission } from "@/lib/auth/authorization"
import { prisma } from "@/lib/prisma/client"
import { createAdminClient } from "@/lib/supabase/server"
import {
  buildInstitutionalEmail,
  formatSchoolIdentityCode,
  generateInitialPassword,
  getCodeConfigForRole,
} from "@/lib/school-identities/code"
import {
  parseSchoolIdentityImportRows,
  type SchoolIdentityImportMode,
} from "@/lib/school-identities/importer"
import {
  normalizeFacultyCode,
  parseCohortYear,
} from "@/lib/school-identities/profile-fields"
import { errorResult, successResult, type ActionResult } from "@/types/api"
import type { SchoolIdentityImportStatus, UserRole } from "@prisma/client"

const DRAFT_IMPORT_TTL_MS = 24 * 60 * 60 * 1000

type PreviewResult = {
  batchId: string
  status: SchoolIdentityImportStatus
  totalRows: number
  failedCount: number
}

type ConfirmResult = {
  batchId: string
  csv: string
  createdCount: number
}

function getFileFromFormData(formData: FormData) {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return null
  }
  return file
}

async function readImportRows(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith(".xlsx")) {
    return readSheet(arrayBuffer)
  }

  const text = buffer.toString("utf8")
  return parseCsvRows(text)
}

function hashFile(bufferSource: string) {
  return createHash("sha256").update(bufferSource).digest("hex")
}

function csvEscape(value: string) {
  if (!/[",\r\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

function buildPasswordCsv(rows: Array<{
  code: string
  institutionalEmail: string
  initialPassword: string
  displayName: string
  role: UserRole
}>) {
  const header = "code,institutionalEmail,initialPassword,displayName,role"
  const body = rows.map((row) =>
    [
      row.code,
      row.institutionalEmail,
      row.initialPassword,
      row.displayName,
      row.role,
    ].map(csvEscape).join(","),
  )
  return [header, ...body].join("\n")
}

function buildFacultyCreateInput(department: string) {
  const code = normalizeFacultyCode(department) || department.trim().toUpperCase()
  return {
    code,
    name: department.trim(),
  }
}

export async function createSchoolIdentityImportPreview(
  formData: FormData,
): Promise<ActionResult<PreviewResult>> {
  try {
    const actor = await requireAdminPermission("admin.users.manage")
    const file = getFileFromFormData(formData)
    if (!file) {
      return errorResult("Vui lòng chọn file CSV hoặc Excel.", "VALIDATION_ERROR")
    }

    const mode = String(formData.get("mode") ?? "CREATE") as SchoolIdentityImportMode
    if (mode !== "CREATE" && mode !== "UPDATE_EXISTING") {
      return errorResult("Chế độ import không hợp lệ.", "VALIDATION_ERROR")
    }

    const rows = await readImportRows(file)
    const fileHash = hashFile(JSON.stringify(rows))
    const parsed = parseSchoolIdentityImportRows(rows, mode)
    const status: SchoolIdentityImportStatus = parsed.errors.length > 0 ? "FAILED" : "PENDING_CONFIRM"

    const batch = await prisma.schoolIdentityImportBatch.create({
      data: {
        mode,
        status,
        fileName: file.name,
        fileHash,
        totalRows: parsed.records.length + parsed.errors.length,
        failedCount: parsed.errors.length,
        importedById: actor.profile.userId,
        errorSummary: parsed.errors.length > 0 ? "File import có lỗi, vui lòng sửa và upload lại." : null,
        rows: {
          create: [
            ...parsed.records.map((record) => ({
              rowNumber: record.rowNumber,
              code: record.code,
              role: record.role,
              displayName: record.displayName,
              department: record.department,
              className: record.className,
              cohort: record.cohort,
              jobTitle: record.jobTitle,
              status: record.status,
              result: "READY" as const,
              rawData: record,
            })),
            ...parsed.errors.map((error) => ({
              rowNumber: error.rowNumber,
              result: "FAILED" as const,
              errorMessage: `${error.field}: ${error.message}`,
              rawData: error,
            })),
          ],
        },
      },
      select: {
        id: true,
        status: true,
        totalRows: true,
        failedCount: true,
      },
    })

    return successResult({
      batchId: batch.id,
      status: batch.status,
      totalRows: batch.totalRows,
      failedCount: batch.failedCount,
    })
  } catch (error) {
    console.error("createSchoolIdentityImportPreview error:", error)
    return errorResult("Không thể tạo bản xem trước import.", "IMPORT_PREVIEW_FAILED")
  }
}

async function reserveCodeForRole(role: UserRole) {
  const config = getCodeConfigForRole(role)
  const sequence = await prisma.schoolIdentityCodeSequence.upsert({
    where: { prefix: config.prefix },
    create: {
      prefix: config.prefix,
      nextNumber: 2,
      padding: config.padding,
    },
    update: {
      nextNumber: { increment: 1 },
      padding: config.padding,
    },
    select: {
      nextNumber: true,
    },
  })

  const reservedNumber = sequence.nextNumber - 1
  return formatSchoolIdentityCode(role, reservedNumber)
}

export async function confirmSchoolIdentityImport(
  batchId: string,
): Promise<ActionResult<ConfirmResult>> {
  const createdSupabaseUsers: string[] = []
  try {
    await requireAdminPermission("admin.users.manage")

    const batch = await prisma.schoolIdentityImportBatch.findUnique({
      where: { id: batchId },
      include: {
        rows: {
          orderBy: { rowNumber: "asc" },
        },
      },
    })

    if (!batch) {
      return errorResult("Không tìm thấy batch import.", "NOT_FOUND")
    }
    if (batch.status !== "PENDING_CONFIRM") {
      return errorResult("Batch import không ở trạng thái chờ xác nhận.", "INVALID_STATE")
    }
    if (Date.now() - batch.createdAt.getTime() > DRAFT_IMPORT_TTL_MS) {
      await prisma.schoolIdentityImportBatch.update({
        where: { id: batch.id },
        data: { status: "EXPIRED" },
      })
      return errorResult("Bản xem trước import đã hết hạn. Vui lòng upload lại file.", "IMPORT_EXPIRED")
    }
    if (batch.failedCount > 0 || batch.rows.some((row) => row.result === "FAILED")) {
      return errorResult("File import còn lỗi, không thể xác nhận.", "IMPORT_HAS_ERRORS")
    }
    if (batch.mode === "UPDATE_EXISTING") {
      const updateRows = batch.rows.map((row) => {
        if (!row.code || !row.role || !row.displayName || !row.department || !row.status) {
          throw new Error(`Import row ${row.rowNumber} is missing required normalized data`)
        }
        return row
      })

      await prisma.$transaction(async (tx) => {
        for (const row of updateRows) {
          const identity = await tx.schoolIdentity.findUnique({
            where: { code: row.code! },
            select: { userId: true, institutionalEmail: true },
          })
          if (!identity) {
            throw new Error(`Mã ${row.code} chưa tồn tại trong kho dữ liệu trường.`)
          }

          const facultyInput = buildFacultyCreateInput(row.department!)
          const faculty = await tx.faculty.upsert({
            where: { code: facultyInput.code },
            update: { name: facultyInput.name },
            create: facultyInput,
            select: { id: true },
          })

          await tx.schoolIdentity.update({
            where: { code: row.code! },
            data: {
              role: row.role!,
              displayName: row.displayName!,
              department: row.department!,
              className: row.className,
              cohort: row.cohort,
              jobTitle: row.jobTitle,
              status: row.status!,
              lastImportedAt: new Date(),
            },
          })
          await tx.userProfile.update({
            where: { userId: identity.userId },
            data: {
              displayName: row.displayName!,
              role: row.role!,
              major: row.department!,
              facultyId: faculty.id,
              year: parseCohortYear(row.cohort),
              studentId: row.role === "STUDENT" ? row.code : null,
            },
          })
          await tx.schoolIdentityImportRow.update({
            where: { id: row.id },
            data: { result: "UPDATED" },
          })
        }

        await tx.schoolIdentityImportBatch.update({
          where: { id: batch.id },
          data: {
            status: "COMPLETED",
            updatedCount: updateRows.length,
            completedAt: new Date(),
          },
        })
      })

      return successResult({
        batchId: batch.id,
        csv: "",
        createdCount: 0,
      })
    }

    if (batch.mode !== "CREATE") {
      return errorResult("Chế độ import không được hỗ trợ.", "UNSUPPORTED_MODE")
    }

    const supabaseAdmin = createAdminClient()
    const createdRows: Array<{
      code: string
      institutionalEmail: string
      initialPassword: string
      displayName: string
      role: UserRole
      userId: string
      department: string
      className: string | null
      cohort: string | null
      jobTitle: string | null
      rowId: string
    }> = []

    for (const row of batch.rows) {
      if (!row.role || !row.displayName || !row.department) {
        throw new Error(`Import row ${row.rowNumber} is missing required normalized data`)
      }

      const code = await reserveCodeForRole(row.role)
      const institutionalEmail = buildInstitutionalEmail(code)
      const initialPassword = generateInitialPassword()

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: institutionalEmail,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          display_name: row.displayName,
          role: row.role,
        },
      })

      if (error || !data.user) {
        throw new Error(error?.message ?? `Cannot create Supabase user for ${institutionalEmail}`)
      }

      createdSupabaseUsers.push(data.user.id)
      createdRows.push({
        code,
        institutionalEmail,
        initialPassword,
        displayName: row.displayName,
        role: row.role,
        userId: data.user.id,
        department: row.department,
        className: row.className,
        cohort: row.cohort,
        jobTitle: row.jobTitle,
        rowId: row.id,
      })
    }

    await prisma.$transaction(async (tx) => {
      for (const row of createdRows) {
        const facultyInput = buildFacultyCreateInput(row.department)
        const faculty = await tx.faculty.upsert({
          where: { code: facultyInput.code },
          update: { name: facultyInput.name },
          create: facultyInput,
          select: { id: true },
        })

        await tx.userProfile.create({
          data: {
            userId: row.userId,
            email: row.institutionalEmail,
            displayName: row.displayName,
            role: row.role,
            studentId: row.role === "STUDENT" ? row.code : null,
            major: row.department,
            facultyId: faculty.id,
            year: parseCohortYear(row.cohort),
          },
        })
        await tx.schoolIdentity.create({
          data: {
            code: row.code,
            institutionalEmail: row.institutionalEmail,
            role: row.role,
            displayName: row.displayName,
            department: row.department,
            className: row.className,
            cohort: row.cohort,
            jobTitle: row.jobTitle,
            status: "ACTIVE",
            userId: row.userId,
            provisionedAt: new Date(),
            lastImportedAt: new Date(),
          },
        })
        await tx.schoolIdentityImportRow.update({
          where: { id: row.rowId },
          data: {
            code: row.code,
            institutionalEmail: row.institutionalEmail,
            result: "CREATED",
          },
        })
      }

      await tx.schoolIdentityImportBatch.update({
        where: { id: batch.id },
        data: {
          status: "COMPLETED",
          createdCount: createdRows.length,
          completedAt: new Date(),
        },
      })
    })

    return successResult({
      batchId: batch.id,
      csv: buildPasswordCsv(createdRows),
      createdCount: createdRows.length,
    })
  } catch (error) {
    console.error("confirmSchoolIdentityImport error:", error)
    const supabaseAdmin = createAdminClient()
    await Promise.allSettled(
      createdSupabaseUsers.map((userId) => supabaseAdmin.auth.admin.deleteUser(userId)),
    )
    await prisma.schoolIdentityImportBatch.updateMany({
      where: { id: batchId },
      data: {
        status: "FAILED",
        errorSummary: error instanceof Error ? error.message : "Không thể xác nhận import.",
      },
    })
    return errorResult("Không thể xác nhận import. Dữ liệu đã được rollback.", "IMPORT_CONFIRM_FAILED")
  }
}
