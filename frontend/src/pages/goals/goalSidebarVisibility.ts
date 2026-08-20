/**
 * 사이드바 목표 위젯 노출 — 기능 OFF와 진입점 숨김을 분리한다.
 *
 * - 기능 ON: 선택 항목이 0개여도 위젯을 남겨 /goals 에서 다시 고를 수 있게 한다.
 * - 기능 OFF: 일반 구성원에게는 숨기고, 학교 관리자만 설정으로 돌아가는 진입점을 둔다.
 */

export type TGoalSidebarAudience = {
  schoolId?: string;
  goalsEnabled?: boolean;
  auth?: string;
};

export type TGoalSidebarMode = "hidden" | "disabled" | "active";

export function isGoalsFeatureEnabled(goalsEnabled?: boolean): boolean {
  return goalsEnabled !== false;
}

export function canManageSchoolGoals(auth?: string): boolean {
  return auth === "admin" || auth === "manager";
}

export function goalsSidebarMode(
  params: TGoalSidebarAudience
): TGoalSidebarMode {
  if (!params.schoolId) return "hidden";
  if (isGoalsFeatureEnabled(params.goalsEnabled)) return "active";
  if (canManageSchoolGoals(params.auth)) return "disabled";
  return "hidden";
}

export function schoolGoalsSettingsPath(schoolId: string): string {
  return `/admin/schools/${schoolId}#목표`;
}
