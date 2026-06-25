import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/login", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cho qua các route public
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Kiểm tra cookie access_token (được set từ auth-context khi login)
  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Áp dụng cho mọi route trừ static files và Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
