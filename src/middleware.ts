import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const SECRET = process.env.NEXTAUTH_SECRET ?? 'dev-insecure-change-me'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow NextAuth endpoints and the login page through unauthenticated.
  if (pathname.startsWith('/api/auth') || pathname === '/login') {
    return NextResponse.next()
  }

  // Static assets (Next internals, icons, etc.) are not gated.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: SECRET })

  // API routes: return 401 when unauthenticated.
  if (pathname.startsWith('/api')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Page routes: redirect to /login when unauthenticated.
  if (!token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
