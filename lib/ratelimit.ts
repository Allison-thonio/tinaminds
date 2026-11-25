type Entry = { count: number; resetAt: number }
const buckets = new Map<string, Entry>()

// Global registration counter to prevent server-wide abuse
let globalCount = 0
let globalResetAt = 0
const GLOBAL_LIMIT = 200 // max 200 registrations per hour server-wide
const GLOBAL_WINDOW = 60 * 60 * 1000

let cleanupScheduled = false

function scheduleCleanup() {
  if (cleanupScheduled) return
  cleanupScheduled = true
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key)
    }
    // Reset global counter if window expired
    if (globalResetAt <= now) {
      globalCount = 0
    }
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

/** Global rate limit — prevents more than GLOBAL_LIMIT registrations per hour across all IPs */
export function checkGlobalRateLimit(): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  if (globalResetAt <= now) {
    globalCount = 1
    globalResetAt = now + GLOBAL_WINDOW
    return { allowed: true, retryAfter: 0 }
  }
  if (globalCount >= GLOBAL_LIMIT) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((globalResetAt - now) / 1000)) }
  }
  globalCount += 1
  return { allowed: true, retryAfter: 0 }
}

/** Returns the current number of tracked IP buckets (for monitoring) */
export function rateLimitBucketCount(): number {
  return buckets.size
}
