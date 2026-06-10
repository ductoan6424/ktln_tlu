import { unstable_cache as nextUnstableCache } from "next/cache"

type AsyncCacheFunction = Parameters<typeof nextUnstableCache>[0]

export function unstableCache<T extends AsyncCacheFunction>(
  fn: T,
  keyParts: string[],
  options: { revalidate: number },
): T {
  if (process.env.NODE_ENV === "test") {
    return fn
  }

  return nextUnstableCache(fn, keyParts, options) as unknown as T
}
