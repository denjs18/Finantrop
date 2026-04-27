import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PROTECTED = ['/dashboard', '/budget', '/investissements', '/projections', '/historique', '/peg']

export async function middleware(req: NextRequest) {
  // Memory mode: skip auth entirely so the app works without env vars
  if (!process.env.MONGODB_URI) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isProtected = PROTECTED.some((p) => req.nextUrl.pathname.startsWith(p))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/budget/:path*',
    '/investissements/:path*',
    '/projections/:path*',
    '/historique/:path*',
    '/peg/:path*',
  ],
}
