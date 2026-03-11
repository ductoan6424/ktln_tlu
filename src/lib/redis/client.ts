import Redis from "ioredis";

// Singleton Redis client để tránh tạo nhiều kết nối
function createRedisClient() {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error("REDIS_URL chưa được cấu hình trong environment variables");
  }

  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

// Global singleton pattern cho Redis client
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
