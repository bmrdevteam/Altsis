export const SESSION_COOKIE_OPTS = {
  path: "/",
  maxAge: 24 * 60 * 60, // 24 hours (seconds)
} as const;

const CLIENT_AUTH_COOKIES = ["currentSchool", "currentRegistration"] as const;

export function clearAuthClientCookies(
  removeCookie: (name: string, options?: { path: string }) => void
) {
  for (const name of CLIENT_AUTH_COOKIES) {
    removeCookie(name, { path: "/" });
  }
}
