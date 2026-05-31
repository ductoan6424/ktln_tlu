import { request } from "node:http"
import { request as httpsRequest } from "node:https"
import { URL } from "node:url"

const DEFAULT_PATHS = [
  "/",
  "/login",
  "/feed",
  "/search?q=test",
  "/clubs",
  "/events",
  "/courses",
]

function parseArgs(argv) {
  const options = {
    baseUrl: "http://localhost:3000",
    concurrency: 1,
    runs: 10,
    warmup: 2,
    paths: DEFAULT_PATHS,
    cookie: (process.env.BENCHMARK_COOKIE ?? "").trim(),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === "--base-url" && next) {
      options.baseUrl = next
      index += 1
    } else if (arg === "--runs" && next) {
      options.runs = Number(next)
      index += 1
    } else if (arg === "--warmup" && next) {
      options.warmup = Number(next)
      index += 1
    } else if (arg === "--concurrency" && next) {
      options.concurrency = Number(next)
      index += 1
    } else if (arg === "--paths" && next) {
      options.paths = next.split(",").map((path) => path.trim()).filter(Boolean)
      index += 1
    } else if (arg === "--cookie" && next) {
      options.cookie = next
      index += 1
    }
  }

  return options
}

function percentile(values, percent) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percent / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))]
}

function summarize(results) {
  const totals = results.map((result) => result.totalMs)
  const ttfbs = results.map((result) => result.ttfbMs)
  const statuses = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] ?? 0) + 1
    return acc
  }, {})

  return {
    requests: results.length,
    statuses,
    total: {
      min: Math.round(Math.min(...totals)),
      avg: Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length),
      p50: Math.round(percentile(totals, 50)),
      p95: Math.round(percentile(totals, 95)),
      p99: Math.round(percentile(totals, 99)),
      max: Math.round(Math.max(...totals)),
    },
    ttfb: {
      avg: Math.round(ttfbs.reduce((sum, value) => sum + value, 0) / ttfbs.length),
      p95: Math.round(percentile(ttfbs, 95)),
    },
  }
}

function hit(url, cookie) {
  return new Promise((resolve) => {
    const startedAt = performance.now()
    let firstByteAt = 0
    const client = url.protocol === "https:" ? httpsRequest : request
    const req = client(
      url,
      {
        method: "GET",
        headers: {
          "user-agent": "uniconnect-local-benchmark/1.0",
          ...(cookie ? { cookie } : {}),
        },
      },
      (res) => {
        res.once("data", () => {
          firstByteAt = performance.now()
        })
        res.resume()
        res.on("end", () => {
          const endedAt = performance.now()
          resolve({
            status: res.statusCode ?? 0,
            ttfbMs: (firstByteAt || endedAt) - startedAt,
            totalMs: endedAt - startedAt,
          })
        })
      },
    )

    req.on("error", (error) => {
      const endedAt = performance.now()
      resolve({
        status: 0,
        ttfbMs: endedAt - startedAt,
        totalMs: endedAt - startedAt,
        error: error.message,
      })
    })
    req.end()
  })
}

async function runPool(tasks, concurrency) {
  const results = []
  let cursor = 0

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor
      cursor += 1
      results[index] = await tasks[index]()
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  )

  return results
}

async function benchmarkPath(options, path) {
  const url = new URL(path, options.baseUrl)

  for (let index = 0; index < options.warmup; index += 1) {
    await hit(url, options.cookie)
  }

  const tasks = Array.from({ length: options.runs }, () => () =>
    hit(url, options.cookie),
  )
  const results = await runPool(tasks, options.concurrency)

  return { path, summary: summarize(results), results }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const startedAt = new Date()
  const report = []

  for (const path of options.paths) {
    report.push(await benchmarkPath(options, path))
  }

  console.log(
    JSON.stringify(
      {
        baseUrl: options.baseUrl,
        startedAt: startedAt.toISOString(),
        runs: options.runs,
        warmup: options.warmup,
        concurrency: options.concurrency,
        paths: report,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
