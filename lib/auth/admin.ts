import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Admin access for the /admin pages.
 *
 * Supabase auth is not available (the project behind the configured URL is
 * gone), so the admin area is gated by a password from env plus a signed,
 * httpOnly session cookie. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in
 * .env.local and in Vercel. With either missing, /admin is disabled.
 */

export const ADMIN_COOKIE = 'fp_admin'
const SESSION_SECONDS = 7 * 24 * 60 * 60 // one week

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET
  return secret && secret.length >= 16 ? secret : null
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD) && getSecret() !== null
}

function sign(expires: string, secret: string): string {
  return createHmac('sha256', secret).update(expires).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function verifyAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(candidate, expected)
}

/** Token stored in the cookie: `<expiry unix seconds>.<hmac>` */
export function createAdminSessionToken(): string {
  const secret = getSecret()
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set')
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
  return `${expires}.${sign(expires, secret)}`
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  const secret = getSecret()
  if (!secret || !token) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature) return false
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false
  return safeEqual(signature, sign(expires, secret))
}

export async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies()
  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE)?.value)
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminRequest())) {
    redirect('/admin/login')
  }
}

export const ADMIN_SESSION_MAX_AGE = SESSION_SECONDS
