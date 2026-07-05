import type { Role } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/dashboard", roles: ["MEMBER", "STAFF", "SUPER_ADMIN"] },
  { prefix: "/member", roles: ["MEMBER", "STAFF", "SUPER_ADMIN"] },
  { prefix: "/bookings", roles: ["MEMBER", "STAFF", "SUPER_ADMIN"] },
  { prefix: "/staff", roles: ["STAFF", "SUPER_ADMIN"] },
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const route = protectedRoutes.find((item) => pathname.startsWith(item.prefix));

  if (!route) {
    return NextResponse.next();
  }

  const secureCookie = request.nextUrl.protocol === "https:";
  const cookieName = secureCookie ? "__Secure-authjs.session-token" : "authjs.session-token";
  const token = await getToken({
    req: request,
    cookieName,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!route.roles.includes(token.role as Role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/member/:path*", "/bookings/:path*", "/staff/:path*", "/admin/:path*"],
};
