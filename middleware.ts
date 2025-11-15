export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/budget/:path*',
    '/investissements/:path*',
    '/projections/:path*',
    '/historique/:path*',
  ],
}
