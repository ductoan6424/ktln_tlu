import fs from "fs"
import path from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

// ─── Cau hinh ─────────────────────────────────────────────────────────────────
// Nhan userId tu argv hoac env (khong hardcode credential vao git).
//
// Cach 1: argv
//   node scripts/backfill-school-identity.mjs <userId> <institutionalEmail> [role] [department]
//
// Cach 2: env vars
//   $env:BACKFILL_USER_ID = "uuid"
//   $env:BACKFILL_INSTITUTIONAL_EMAIL = "user@example.com"
//   $env:BACKFILL_ROLE = "ADMIN"           # ADMIN | STUDENT | LECTURER (mac dinh: lay tu UserProfile)
//   $env:BACKFILL_DEPARTMENT = "He thong"  # mac dinh: "He thong"
//   node scripts/backfill-school-identity.mjs

const USER_ID = (process.argv[2] ?? process.env.BACKFILL_USER_ID ?? "").trim()
const INSTITUTIONAL_EMAIL = (process.argv[3] ?? process.env.BACKFILL_INSTITUTIONAL_EMAIL ?? "")
  .trim()
  .toLowerCase()
const ROLE_OVERRIDE = (process.argv[4] ?? process.env.BACKFILL_ROLE ?? "").trim().toUpperCase()
const DEPARTMENT = (process.argv[5] ?? process.env.BACKFILL_DEPARTMENT ?? "He thong").trim()

const ROLE_PREFIX = {
  ADMIN: "AD",
  LECTURER: "GV",
  STUDENT: "SV",
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex < 0) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    if (process.env[key] === undefined) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, "")
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"))
loadEnvFile(path.resolve(process.cwd(), ".env.local"))

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  if (!USER_ID || !INSTITUTIONAL_EMAIL) {
    console.error("Usage: node scripts/backfill-school-identity.mjs <userId> <institutionalEmail> [role] [department]")
    console.error("   or set BACKFILL_USER_ID and BACKFILL_INSTITUTIONAL_EMAIL env vars")
    process.exitCode = 1
    return
  }

  const profile = await prisma.userProfile.findUnique({ where: { userId: USER_ID } })
  if (!profile) {
    throw new Error(`UserProfile not found for userId=${USER_ID}`)
  }

  const existingIdentity = await prisma.schoolIdentity.findFirst({
    where: { OR: [{ userId: USER_ID }, { institutionalEmail: INSTITUTIONAL_EMAIL }] },
  })
  if (existingIdentity) {
    throw new Error(
      `SchoolIdentity already exists: code=${existingIdentity.code}, email=${existingIdentity.institutionalEmail}`,
    )
  }

  const role = ROLE_OVERRIDE || profile.role
  const prefix = ROLE_PREFIX[role]
  if (!prefix) {
    throw new Error(`Unsupported role: ${role}. Allowed: ADMIN | LECTURER | STUDENT`)
  }

  console.log(`Backfilling SchoolIdentity for user=${USER_ID}`)
  console.log(`  email=${INSTITUTIONAL_EMAIL}, role=${role}, department=${DEPARTMENT}`)

  const result = await prisma.$transaction(async (tx) => {
    const sequence = await tx.schoolIdentityCodeSequence.upsert({
      where: { prefix },
      create: { prefix, nextNumber: 2, padding: prefix === "AD" ? 3 : prefix === "GV" ? 3 : 4 },
      update: { nextNumber: { increment: 1 } },
    })
    const reservedNumber = sequence.nextNumber - 1
    const code = `${prefix}${String(reservedNumber).padStart(sequence.padding, "0")}`

    const identity = await tx.schoolIdentity.create({
      data: {
        code,
        institutionalEmail: INSTITUTIONAL_EMAIL,
        role,
        displayName: profile.displayName,
        department: DEPARTMENT,
        status: "ACTIVE",
        userId: USER_ID,
        provisionedAt: new Date(),
        lastImportedAt: new Date(),
      },
    })

    return identity
  })

  console.log("Created SchoolIdentity:")
  console.log(`  code: ${result.code}`)
  console.log(`  institutionalEmail: ${result.institutionalEmail}`)
  console.log(`  status: ${result.status}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
