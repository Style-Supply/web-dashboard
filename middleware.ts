import { NextResponse } from 'next/server';

/**
 * Pass-through middleware.
 *
 * The dashboard's Supabase session is stored client-side (localStorage via
 * @supabase/supabase-js), not in cookies, so server-side cookie-based auth
 * here cannot see it — a cookie-reading gate causes an OAuth redirect loop.
 *
 * Auth is enforced where it matters instead:
 *  - Backend `adminMiddleware` validates the JWT + `@stylesupply.io` / admin
 *    role on every `/api/admin/*` request (the dashboard holds no secrets;
 *    it only renders data from that locked-down API).
 *  - Client-side `AuthContext` redirects unauthenticated users to /login and
 *    signs out non-stylesupply.io accounts.
 */
export function middleware(): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
