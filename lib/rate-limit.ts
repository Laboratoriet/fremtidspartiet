import { getRedisClient } from '@/lib/redis/config'

/**
 * Fixed-window rate limiting on the shared Redis wrapper, so it works with
 * both local Redis and Upstash. Each rule keeps one counter per window.
 */

export type RateLimitRule = {
  /** Short label used in the Redis key, e.g. "visitor:10m" */
  name: string
  /** Max requests per window */
  limit: number
  /** Window length in seconds */
  windowSeconds: number
}

export type RateLimitResult = {
  allowed: boolean
  /** Seconds until the offending window resets (0 when allowed) */
  retryAfterSeconds: number
  /** Which rule blocked the request, if any */
  rule?: RateLimitRule
}

/** Limits for one visitor (cookie) and one IP. Both must pass. */
export const CHAT_LIMITS = {
  visitor: [
    { name: 'visitor:10m', limit: 20, windowSeconds: 10 * 60 },
    { name: 'visitor:1d', limit: 120, windowSeconds: 24 * 60 * 60 }
  ],
  ip: [
    { name: 'ip:10m', limit: 60, windowSeconds: 10 * 60 },
    { name: 'ip:1d', limit: 400, windowSeconds: 24 * 60 * 60 }
  ]
} satisfies Record<string, RateLimitRule[]>

export async function checkRateLimit(
  identifier: string,
  rules: RateLimitRule[]
): Promise<RateLimitResult> {
  const redis = await getRedisClient()
  const now = Math.floor(Date.now() / 1000)

  for (const rule of rules) {
    const windowStart = now - (now % rule.windowSeconds)
    const key = `ratelimit:${rule.name}:${identifier}:${windowStart}`
    const count = await redis.incr(key)
    if (count === 1) {
      // First hit in this window: let the key expire with the window
      await redis.expire(key, rule.windowSeconds + 5)
    }
    if (count > rule.limit) {
      return {
        allowed: false,
        retryAfterSeconds: windowStart + rule.windowSeconds - now,
        rule
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

/** Client IP as seen behind Vercel's proxy; falls back to a shared bucket. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') ?? 'unknown'
}
