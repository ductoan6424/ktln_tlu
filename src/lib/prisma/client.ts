import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import {
  isPerformanceLoggingEnabled,
  logPerformanceEvent,
} from "@/lib/performance/logging"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const performanceLoggingEnabled = isPerformanceLoggingEnabled()
  const client = new PrismaClient({ adapter })

  if (performanceLoggingEnabled) {
    return client.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const startedAt = performance.now()
            try {
              return await query(args)
            } finally {
              logPerformanceEvent({
                kind: "db",
                name: `${model}.${operation}`,
                durationMs: performance.now() - startedAt,
              })
            }
          },
        },
      },
    }) as PrismaClient
  }

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
