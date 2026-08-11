/**
 * 세션 재검증 시 인증 실패와 일시적 네트워크 오류를 구분한다.
 * 백엔드 isLoggedIn은 비로그인에 403을 반환한다.
 */
export function isSessionAuthFailure(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

export function loginPathForAcademy(academyId?: string | null): string {
  if (academyId && String(academyId).trim()) {
    return `/${String(academyId).trim()}/login`;
  }
  return "/login";
}
