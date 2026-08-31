import { clearLastContext } from "./lastContext";

export const SESSION_COOKIE_OPTS = {
  path: "/",
  maxAge: 24 * 60 * 60, // 24 hours (seconds)
} as const;

const CLIENT_AUTH_COOKIES = ["currentSchool", "currentRegistration"] as const;

export type ClientAuthCookieName = (typeof CLIENT_AUTH_COOKIES)[number];

export function clearAuthClientCookies(
  removeCookie: (
    name: ClientAuthCookieName,
    options?: { path: string }
  ) => void
) {
  for (const name of CLIENT_AUTH_COOKIES) {
    removeCookie(name, { path: "/" });
  }
  clearLastContext();
}
