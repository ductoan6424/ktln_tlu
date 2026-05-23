import fs from "fs"
import path from "path"
import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

const DEFAULT_ADMIN = {
  code: "AD001",
  email: "ad001@thanglong.edu.vn",
  password: "Admin@123456",
  displayName: "Quan tri he thong",
  department: "He thong",
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

const prisma = new PrismaClient()

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const existingIdentity = await prisma.schoolIdentity.findUnique({
    where: { code: DEFAULT_ADMIN.code },
  })
  if (existingIdentity) {
    console.log(`Default admin already exists: ${DEFAULT_ADMIN.email}`)
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEFAULT_ADMIN.email,
    password: DEFAULT_ADMIN.password,
    email_confirm: true,
    user_metadata: {
      display_name: DEFAULT_ADMIN.displayName,
      role: "ADMIN",
    },
  })

  if (error || !data.user) {
    throw new Error(error?.message ?? "Cannot create default admin in Supabase")
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userProfile.create({
        data: {
          userId: data.user.id,
          email: DEFAULT_ADMIN.email,
          displayName: DEFAULT_ADMIN.displayName,
          role: "ADMIN",
          major: DEFAULT_ADMIN.department,
        },
      })
      await tx.schoolIdentity.create({
        data: {
          code: DEFAULT_ADMIN.code,
          institutionalEmail: DEFAULT_ADMIN.email,
          role: "ADMIN",
          displayName: DEFAULT_ADMIN.displayName,
          department: DEFAULT_ADMIN.department,
          status: "ACTIVE",
          userId: data.user.id,
          provisionedAt: new Date(),
          lastImportedAt: new Date(),
        },
      })
      await tx.schoolIdentityCodeSequence.upsert({
        where: { prefix: "AD" },
        create: { prefix: "AD", nextNumber: 2, padding: 3 },
        update: { nextNumber: { increment: 1 }, padding: 3 },
      })
    })
  } catch (error) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => {})
    throw error
  }

  console.log("Default admin created")
  console.log(`Login: ${DEFAULT_ADMIN.email}`)
  console.log(`Password: ${DEFAULT_ADMIN.password}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
