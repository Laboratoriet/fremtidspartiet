import { getRedisClient } from '@/lib/redis/config'
import { exampleMessages } from './examples'

/**
 * Public "Andre har spurt" feed: the first question of recent chats that
 * passed review (see ./review.ts). Questions only, never answers.
 *
 * Keys
 *   feed:entries      zset  member = chatId, score = visibleAt (ms)
 *   feed:q:<chatId>   hash  { chatId, question, createdAt, visibleAt }
 *   feed:seen         set   normalised question text, for dedupe
 *   feed:reviewed     set   chatIds already reviewed (any outcome)
 */

export const FEED_ENTRIES_KEY = 'feed:entries'
export const FEED_SEEN_KEY = 'feed:seen'
export const FEED_REVIEWED_KEY = 'feed:reviewed'
const FEED_MAX_ENTRIES = 200

export type FeedQuestion = {
  chatId: string
  question: string
  createdAt: number
  visibleAt: number
}

export function isFeedEnabled(): boolean {
  return process.env.ENABLE_PUBLIC_FEED !== 'false' && !!process.env.OPENAI_API_KEY
}

/** Minutes a question is held before it appears, so a bad one can be caught. */
export function feedDelayMs(): number {
  const minutes = Number(process.env.PUBLIC_FEED_DELAY_MINUTES)
  return (Number.isFinite(minutes) && minutes >= 0 ? minutes : 10) * 60_000
}

const entryKey = (chatId: string) => `feed:q:${chatId}`

/** Lowercased, punctuation-free form used to spot duplicates. */
export function normaliseQuestion(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Keys a question is known by: the whole text and its first sentence. */
export function questionKeys(question: string): string[] {
  const full = normaliseQuestion(question)
  const firstSentence = normaliseQuestion(question.split(/[?.!]/)[0] ?? '')
  return firstSentence && firstSentence !== full ? [full, firstSentence] : [full]
}

const EXAMPLE_KEYS = new Set(
  exampleMessages.flatMap(e => [...questionKeys(e.heading), ...questionKeys(e.message)])
)

/** True if this text (or an example prompt) is already shown. Check raw AND cleaned text. */
export async function isDuplicateQuestion(question: string): Promise<boolean> {
  const redis = await getRedisClient()
  for (const key of questionKeys(question)) {
    if (EXAMPLE_KEYS.has(key)) return true
    if (await redis.sismember(FEED_SEEN_KEY, key)) return true
  }
  return false
}

export async function markReviewed(chatId: string): Promise<void> {
  const redis = await getRedisClient()
  await redis.sadd(FEED_REVIEWED_KEY, chatId)
}

export async function isReviewed(chatId: string): Promise<boolean> {
  const redis = await getRedisClient()
  return redis.sismember(FEED_REVIEWED_KEY, chatId)
}

export async function addToFeed(
  chatId: string,
  question: string,
  createdAt = Date.now(),
  { immediate = false, alsoSeen = [] as string[] } = {}
): Promise<FeedQuestion> {
  const redis = await getRedisClient()
  const entry: FeedQuestion = {
    chatId,
    question,
    createdAt,
    visibleAt: immediate ? Date.now() : Date.now() + feedDelayMs()
  }
  await redis.hmset(entryKey(chatId), entry)
  await redis.zadd(FEED_ENTRIES_KEY, entry.visibleAt, chatId)
  for (const text of [question, ...alsoSeen]) {
    for (const key of questionKeys(text)) {
      await redis.sadd(FEED_SEEN_KEY, key)
    }
  }
  await redis.sadd(FEED_REVIEWED_KEY, chatId)
  await redis.ztrim(FEED_ENTRIES_KEY, FEED_MAX_ENTRIES)
  return entry
}

export async function removeFromFeed(chatId: string): Promise<boolean> {
  const redis = await getRedisClient()
  const existing = await getFeedEntry(chatId)
  if (!existing) return false
  await redis.zrem(FEED_ENTRIES_KEY, chatId)
  await redis.del(entryKey(chatId))
  // Keep the normalised text in feed:seen so the same question is not re-added
  return true
}

export async function getFeedEntry(chatId: string): Promise<FeedQuestion | null> {
  const redis = await getRedisClient()
  const raw = await redis.hgetall<Record<string, string>>(entryKey(chatId))
  if (!raw || !raw.question) return null
  return {
    chatId: raw.chatId,
    question: raw.question,
    createdAt: Number(raw.createdAt),
    visibleAt: Number(raw.visibleAt)
  }
}

/** Newest visible questions first. */
export async function listFeed(limit = 8): Promise<FeedQuestion[]> {
  if (!isFeedEnabled()) return []
  try {
    const redis = await getRedisClient()
    const ids = await redis.zrange(FEED_ENTRIES_KEY, 0, limit * 4 - 1, { rev: true })
    const now = Date.now()
    const entries = await Promise.all(ids.map(getFeedEntry))
    return entries
      .filter((e): e is FeedQuestion => e !== null && e.visibleAt <= now)
      .slice(0, limit)
  } catch (error) {
    console.error('listFeed failed:', error)
    return []
  }
}
