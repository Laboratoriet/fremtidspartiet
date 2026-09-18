/**
 * Anonymous visitor identity.
 *
 * Logged-out visitors get a random, httpOnly cookie so each browser has its
 * own chat history and rate-limit bucket. Before this, every anonymous
 * visitor shared one history list. Edge-safe: no Node imports.
 */

export const VISITOR_COOKIE = 'fp_visitor'
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // one year

const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function isValidVisitorId(value: string | undefined | null): value is string {
  return typeof value === 'string' && VISITOR_ID_PATTERN.test(value)
}

export function createVisitorId(): string {
  return crypto.randomUUID()
}

/** User id used for storage and rate limiting when nobody is logged in. */
export function anonymousUserId(visitorId: string): string {
  return `anon:${visitorId}`
}
