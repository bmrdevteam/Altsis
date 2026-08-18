/** Skip a second RMySelf if a recent resume already confirmed the session. */
export const RESUME_CHECK_MIN_INTERVAL_MS = 30 * 1000;

export type ResumeSessionDecision = "skip" | "check";

export function isSessionAuthFailure(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

export function loginPathForAcademy(academyId?: string | null): string {
  const id = String(academyId ?? "").trim();
  if (!id || id === "0" || id === "undefined") return "/login";
  return `/${encodeURIComponent(id)}/login`;
}

export function decideResumeSessionCheck(input: {
  loading: boolean;
  hasUser: boolean;
  pathname: string;
  inFlight: boolean;
  lastOkAt: number;
  now: number;
  minIntervalMs?: number;
}): ResumeSessionDecision {
  if (input.loading || !input.hasUser || input.inFlight) return "skip";
  if (input.pathname.includes("/login")) return "skip";
  const minInterval = input.minIntervalMs ?? RESUME_CHECK_MIN_INTERVAL_MS;
  if (input.lastOkAt > 0 && input.now - input.lastOkAt < minInterval) {
    return "skip";
  }
  return "check";
}
