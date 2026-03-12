import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BLOCKED = [
  '/settings',
  '/broadcast',
  '/backup',
  '/backup-restore',
  '/restore',
  '/reports',
  '/license',
  '/login'
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (BLOCKED.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|static|favicon.ico).*)'],
}
