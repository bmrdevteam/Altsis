/** Path segments that are app routes, not academy IDs. */
const KNOWN_NON_ACADEMY_SEGMENTS = new Set([
  "login",
  "register",
  "admin",
  "owner",
  "courses",
  "archive",
  "myArchive",
  "docs",
  "forms",
  "notifications",
  "boards",
  "settings",
  "myaccount",
  "search",
  "dev",
  "sites",
  "chat",
]);

/** Credential / academy lookup failures — not an expired session. */
const LOGIN_FAILURE_MESSAGES = new Set([
  "PASSWORD_INCORRECT",
  "USER_NOT_FOUND",
  "ACADEMY_NOT_FOUND",
  "ACADEMY_INACTIVATED",
]);

export type HttpErrorLike = {
  response?: {
    status?: number;
    data?: { message?: string };
  };
  config?: { url?: string };
};

function errorStatus(error: unknown): number | undefined {
  return (error as HttpErrorLike)?.response?.status;
}

function errorMessage(error: unknown): string | undefined {
  const message = (error as HttpErrorLike)?.response?.data?.message;
  return typeof message === "string" ? message : undefined;
}

function errorUrl(error: unknown): string {
  return (error as HttpErrorLike)?.config?.url ?? "";
}

/**
 * True when the request failed because there is no valid login session.
 * Does not treat login-form failures (wrong password, unknown user) as expiry.
 */
export function isUnauthenticatedError(
  error: unknown,
  options?: { currentUserEndpoint?: boolean }
): boolean {
  const message = errorMessage(error);
  if (message && LOGIN_FAILURE_MESSAGES.has(message)) return false;
  if (message === "NOT_LOGGED_IN") return true;

  const status = errorStatus(error);
  if (status === 401) return true;

  const currentUserEndpoint =
    options?.currentUserEndpoint === true ||
    errorUrl(error).includes("users/current");
  // Legacy isLoggedIn used 403 PERMISSION_DENIED for guests
  if (currentUserEndpoint && status === 403) return true;

  return false;
}

export function isLoginPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/login" || normalized === "/register") return true;
  return /\/login$/.test(normalized);
}

export function isPublicPath(pathname: string): boolean {
  if (isLoginPath(pathname)) return true;
  const first = pathname.split("/").filter(Boolean)[0];
  return first === "sites";
}

/**
 * Academy-scoped login when the URL starts with an academy id
 * (e.g. /bmr/br → /bmr/login). Otherwise the academy picker.
 */
export function getLoginPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const academyId = segments[0];
  if (
    academyId &&
    !KNOWN_NON_ACADEMY_SEGMENTS.has(academyId)
  ) {
    return `/${academyId}/login`;
  }
  return "/login";
}

let redirecting = false;

export function resetLoginRedirectState() {
  redirecting = false;
}

/**
 * Full-page navigation to login so frozen SPA state cannot linger.
 * No-ops on login/register routes and while a redirect is already in flight.
 */
export function redirectToLogin(
  pathname: string = typeof window !== "undefined"
    ? window.location.pathname
    : "/",
  assign: (url: string) => void = (url) => {
    window.location.replace(url);
  }
): void {
  if (isPublicPath(pathname) || redirecting) return;
  redirecting = true;
  assign(getLoginPath(pathname));
}
