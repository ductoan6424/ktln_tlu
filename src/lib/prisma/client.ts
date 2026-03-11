// Prisma client singleton
// Import sẽ hoạt động sau khi chạy `npx prisma generate`
// Hiện tại export placeholder để không ảnh hưởng build

// import { PrismaClient } from "@/generated/prisma";

// Singleton pattern cho Prisma client
// Uncomment khi đã có DATABASE_URL và chạy `npx prisma generate`

// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };

// export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// if (process.env.NODE_ENV !== "production") {
//   globalForPrisma.prisma = prisma;
// }

export {};
