'use server'

import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  isAdminConfigured,
  requireAdmin,
  verifyAdminPassword
} from '@/lib/auth/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { getRedisClient } from '@/lib/redis/config'
import { type Chat } from '@/lib/types'
import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ALL_CHATS_KEY } from '@/lib/redis/keys'
import { reviewQuestion } from '@/lib/feed/review'
import {
  addToFeed,
  getFeedEntry,
  isReviewed,
  removeFromFeed,
  type FeedQuestion
} from '@/lib/feed/store'

const LOGIN_LIMIT = [{ name: 'admin-login', limit: 10, windowSeconds: 10 * 60 }]

async function clientIp(): Promise<string> {
  const headerStore = await headers()
  const forwarded = headerStore.get('x-forwarded-for')
  return forwarded?.split(',')[0].trim() ?? headerStore.get('x-real-ip') ?? 'unknown'
}

export async function loginAdmin(formData: FormData) {
  if (!isAdminConfigured()) {
    redirect('/admin/login?error=unconfigured')
  }

  const limit = await checkRateLimit(`admin:${await clientIp()}`, LOGIN_LIMIT)
  if (!limit.allowed) {
    redirect('/admin/login?error=ratelimit')
  }

  const password = String(formData.get('password') ?? '')
  if (!verifyAdminPassword(password)) {
    redirect('/admin/login?error=wrong')
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: ADMIN_SESSION_MAX_AGE
  })
  redirect('/admin')
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete({ name: ADMIN_COOKIE, path: '/admin' })
  redirect('/admin/login')
}

function parseChat(raw: Record<string, any> | null): Chat | null {
  if (!raw || Object.keys(raw).length === 0) return null
  const chat = { ...raw }
  if (typeof chat.messages === 'string') {
    try {
      chat.messages = JSON.parse(chat.messages)
    } catch {
      chat.messages = []
    }
  }
  if (!Array.isArray(chat.messages)) chat.messages = []
  chat.createdAt = new Date(chat.createdAt)
  return chat as Chat
}

const ADMIN_PAGE_SIZE = 30

export async function listAllChats(page = 0) {
  await requireAdmin()
  const redis = await getRedisClient()
  const total = await redis.zcard(ALL_CHATS_KEY)
  const start = page * ADMIN_PAGE_SIZE
  const keys = await redis.zrange(ALL_CHATS_KEY, start, start + ADMIN_PAGE_SIZE - 1, {
    rev: true
  })
  const chats = (
    await Promise.all(keys.map(key => redis.hgetall<Record<string, any>>(key)))
  )
    .map(parseChat)
    .filter((chat): chat is Chat => chat !== null)

  return { chats, total, page, pageCount: Math.ceil(total / ADMIN_PAGE_SIZE) }
}

export async function getChatAsAdmin(id: string): Promise<Chat | null> {
  await requireAdmin()
  const redis = await getRedisClient()
  return parseChat(await redis.hgetall<Record<string, any>>(`chat:${id}`))
}

export async function deleteChatAsAdmin(id: string) {
  await requireAdmin()
  const redis = await getRedisClient()
  const chatKey = `chat:${id}`
  const chat = await redis.hgetall<Record<string, any>>(chatKey)
  if (chat && chat.userId) {
    await redis.zrem(`user:v2:chat:${chat.userId}`, chatKey)
  }
  await redis.zrem(ALL_CHATS_KEY, chatKey)
  await redis.del(chatKey)
  await removeFromFeed(id)
  revalidatePath('/admin')
  revalidatePath('/')
  redirect('/admin')
}

export async function getFeedStatus(
  chatId: string
): Promise<{ entry: FeedQuestion | null; reviewed: boolean }> {
  await requireAdmin()
  return { entry: await getFeedEntry(chatId), reviewed: await isReviewed(chatId) }
}

export async function removeChatFromFeed(chatId: string) {
  await requireAdmin()
  await removeFromFeed(chatId)
  revalidatePath('/')
  revalidatePath(`/admin/${chatId}`)
}

/** Admin override: put the first question on the feed right away, skipping review. */
export async function addChatToFeed(chatId: string) {
  await requireAdmin()
  const chat = await getChatAsAdmin(chatId)
  const first = chat?.messages.find(m => m.role === 'user')
  const question =
    typeof first?.content === 'string'
      ? first.content
      : Array.isArray(first?.content)
        ? first.content
            .map(part => (part && typeof part === 'object' && 'text' in part ? String(part.text) : ''))
            .join('')
        : ''
  if (!question.trim()) return
  await addToFeed(chatId, question.trim(), chat?.createdAt.getTime(), { immediate: true })
  revalidatePath('/')
  revalidatePath(`/admin/${chatId}`)
}

/** Review the newest chats that were never reviewed (e.g. everything before the feed existed). */
export async function backfillFeed(limit = 100): Promise<{ reviewed: number; published: number }> {
  await requireAdmin()
  const redis = await getRedisClient()
  const keys = await redis.zrange(ALL_CHATS_KEY, 0, limit - 1, { rev: true })
  let reviewed = 0
  let published = 0
  for (const key of keys) {
    const chat = parseChat(await redis.hgetall<Record<string, any>>(key))
    if (!chat || (await isReviewed(chat.id))) continue
    const first = chat.messages.find(m => m.role === 'user')
    const question =
      typeof first?.content === 'string'
        ? first.content
        : Array.isArray(first?.content)
          ? first.content
              .map(part => (part && typeof part === 'object' && 'text' in part ? String(part.text) : ''))
              .join('')
          : ''
    if (!question.trim()) continue
    reviewed++
    const outcome = await reviewQuestion(chat.id, question.trim())
    if (outcome.published) published++
  }
  revalidatePath('/')
  return { reviewed, published }
}

export async function backfillFeedAndRedirect() {
  const { reviewed, published } = await backfillFeed()
  redirect(`/admin?feed=${published}of${reviewed}`)
}

/**
 * Rebuild the global index from every `chat:*` hash. Needed once after
 * deploying the index, so chats saved before it (including the old shared
 * anonymous history) show up.
 */
export async function reindexAllChatsAndRedirect() {
  const { indexed } = await reindexAllChats()
  redirect(`/admin?reindexed=${indexed}`)
}

export async function reindexAllChats(): Promise<{ indexed: number }> {
  await requireAdmin()
  const redis = await getRedisClient()
  let cursor = '0'
  let indexed = 0
  do {
    const result = await redis.scan(cursor, 'chat:*', 200)
    cursor = result.cursor
    for (const key of result.keys) {
      const chat = await redis.hgetall<Record<string, any>>(key)
      if (!chat) continue
      const createdAt = Date.parse(chat.createdAt) || Date.now()
      await redis.zadd(ALL_CHATS_KEY, createdAt, key)
      indexed++
    }
  } while (cursor !== '0')
  revalidatePath('/admin')
  return { indexed }
}
