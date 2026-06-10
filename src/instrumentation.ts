export async function register() {
  const { installPerformanceFetchLogging } = await import("@/lib/performance/fetch")

  installPerformanceFetchLogging()
}
