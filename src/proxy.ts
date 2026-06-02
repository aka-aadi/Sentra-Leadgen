import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth');
  const token = request.cookies.get('auth-token')?.value;

  // Let authentication pages pass through
  if (isAuthPage || isAuthApi) {
    // If they already have a token and try to visit /login, redirect to dashboard
    if (isAuthPage && token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Require token for everything else
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|logo|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
