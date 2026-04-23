import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const auth = NextAuth(authConfig).auth;

export function proxy(...args) {
  return auth(...args);
}

export const config = {
  // Match all paths except api, _next/static, _next/image, favicon.ico, and png images in public
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
