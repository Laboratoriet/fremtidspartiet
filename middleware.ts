import {
  createVisitorId,
  isValidVisitorId,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE
} from '@/lib/auth/visitor'
import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get the protocol from X-Forwarded-Proto header or request protocol
  const protocol =
    request.headers.get('x-forwarded-proto') || request.nextUrl.protocol

  // Get the host from X-Forwarded-Host header or request host
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || ''

  // Construct the base URL - ensure protocol has :// format
  const baseUrl = `${protocol}${protocol.endsWith(':') ? '//' : '://'}${host}`

  // Give every browser its own anonymous visitor id. Setting it on the
  // request too means server components see it on this very first request.
  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value
  let visitorIsNew = false
  if (!isValidVisitorId(visitorId)) {
    visitorId = createVisitorId()
    visitorIsNew = true
    request.cookies.set(VISITOR_COOKIE, visitorId)
  }

  // Create a response
  let response: NextResponse

  // Handle Supabase session if configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    response = await updateSession(request)
  } else {
    // If Supabase is not configured, just pass the request through
    response = NextResponse.next({
      request
    })
  }

  if (visitorIsNew) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: VISITOR_COOKIE_MAX_AGE
    })
  }

  // Add request information to response headers
  response.headers.set('x-url', request.url)
  response.headers.set('x-host', host)
  response.headers.set('x-protocol', protocol)
  response.headers.set('x-base-url', baseUrl)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
