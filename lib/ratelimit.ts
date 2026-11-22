type Entry = { count: number; resetAt: number }
const buckets = new Map<string, Entry>()
let cleanupScheduled = false

function scheduleCleanup() {
  if (cleanupScheduled) return
  cleanupScheduled = true
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of buckets) if (entry.resetAt <= now) buckets.delete(key)
  }, 60_000)
  timer.unref()
}

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  scheduleCleanup()
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }
  if (current.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
  current.count += 1
  return { allowed: true, retryAfter: 0 }
}
