import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that are always allowed
  // 1. /api/auth/* (Login API)
  // 2. /api/public/* (If we create public APIs)
  // 3. /login (The login page)
  // 4. /public (The public intake form)
  // 5. /_next/static, /favicon.ico, etc. (Static assets)
  // 6. /.netlify/functions/* (Netlify functions if accessed directly, though usually via /api proxy?)
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // naive check for files like favicon.ico, images
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  // const token = request.cookies.get('crm_access_token');

  // if (!token || token.value !== 'authenticated') {
  //   // Redirect to login
  //   const loginUrl = new URL('/login', request.url);
  //   return NextResponse.redirect(loginUrl);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes, but we excluded auth/public inside)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
