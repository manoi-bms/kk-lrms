// T090: Next.js middleware — route protection with NextAuth
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth'];
const STATIC_PATHS = ['/_next', '/favicon.ico'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow static assets and public paths
  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check authentication
  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only route protection
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const userRole = (session.user as unknown as { role?: string }).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
