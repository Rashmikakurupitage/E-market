import { NextResponse } from 'next/server';

export function proxy(request) {
  if (process.env.NEXT_DIST_DIR === '.next-admin' && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}
