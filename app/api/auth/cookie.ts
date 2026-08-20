import { cookies } from "next/headers";
import { SESSION_COOKIE } from "../../../db/auth";

export async function setAuthCookie(token: string, expiresAt: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearAuthCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}
