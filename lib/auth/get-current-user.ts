import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import {
  anonymousUserId,
  createVisitorId,
  isValidVisitorId,
  VISITOR_COOKIE
} from './visitor'

export async function getCurrentUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null // Supabase is not configured
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
}

/**
 * Identity used for chat ownership and rate limiting.
 * Logged in: the Supabase user id. Logged out: `anon:<visitor cookie>`.
 * With no valid cookie (middleware skipped), a throwaway id keeps the
 * request isolated instead of falling into a shared bucket.
 */
export async function getCurrentUserId() {
  const user = await getCurrentUser()
  if (user?.id) {
    return user.id
  }

  const cookieStore = await cookies()
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value
  return anonymousUserId(
    isValidVisitorId(visitorId) ? visitorId : `tmp-${createVisitorId()}`
  )
}
