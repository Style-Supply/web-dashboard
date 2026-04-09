import { NextResponse } from 'next/server';

// Task 12 (auth) will plug authentication here. For now, pass through.
export function middleware(): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
