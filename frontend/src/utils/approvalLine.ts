import {
  TAltFormField,
} from "types/altForm";

export type TApprovalStepMode = "fixed" | "pick";

export type TApprovalApprover = {
  user: string;
  userId: string;
  userName: string;
};

export type TApprovalLineStepDef = {
  order: number;
  label: string;
  mode: TApprovalStepMode;
  approver?: TApprovalApprover;
};

export type TApprovalCirculationMode = "off" | "pick" | "fixed";

export type TApprovalCirculation = {
  mode: TApprovalCirculationMode;
  users: TApprovalApprover[];
};

export type TApprovalLine = {
  steps: TApprovalLineStepDef[];
  circulation?: TApprovalCirculation;
};

export type TApprovalStepRuntime = TApprovalLineStepDef & {
  status: "waiting" | "pending" | "approved" | "rejected";
  reason?: string;
  actedAt?: string;
};

export type TApprovalValueV2 = {
  version: 2;
  currentStep: number;
  overallStatus: "pending" | "approved" | "rejected";
  /** legacy mirror */
  status?: string;
  approver?: TApprovalApprover;
  currentApproverUserId?: string;
  reason?: string;
  steps: TApprovalStepRuntime[];
  circulation?: TApprovalApprover[];
};

export function getApprovalLineSteps(
  field: Pick<TAltFormField, "approvalLine"> | TAltFormField
): TApprovalLineStepDef[] {
  const steps = field?.approvalLine?.steps;
  if (Array.isArray(steps) && steps.length > 0) {
    return steps
      .map((s, i) => ({
        order: typeof s.order === "number" ? s.order : i,
        label: s.label || `${i + 1}차 승인`,
        mode: (s.mode === "fixed" ? "fixed" : "pick") as TApprovalStepMode,
        approver: s.approver,
      }))
      .sort((a, b) => a.order - b.order);
  }
  return [{ order: 0, label: "1차 승인", mode: "pick" }];
}

export function normalizeApprovalValue(
  value: any,
  field?: Pick<TAltFormField, "approvalLine">
): TApprovalValueV2 | null {
  if (!value || typeof value !== "object") return null;

  if (value.version === 2 && Array.isArray(value.steps)) {
    return {
      ...value,
      overallStatus: value.overallStatus || value.status || "pending",
      currentStep:
        typeof value.currentStep === "number" ? value.currentStep : 0,
      currentApproverUserId:
        value.currentApproverUserId ||
        value.steps[value.currentStep]?.approver?.userId ||
        value.approver?.userId,
    } as TApprovalValueV2;
  }

  const lineSteps = getApprovalLineSteps(field || { approvalLine: undefined });
  const step0 = lineSteps[0] || {
    order: 0,
    label: "1차 승인",
    mode: "pick" as const,
  };
  const status = (value.status || "pending") as
    | "pending"
    | "approved"
    | "rejected";
  return {
    version: 2,
    currentStep: 0,
    overallStatus: status,
    status,
    approver: value.approver,
    reason: value.reason,
    currentApproverUserId: value.approver?.userId,
    circulation: Array.isArray(value.circulation) ? value.circulation : [],
    steps: [
      {
        order: step0.order,
        label: step0.label,
        mode: step0.mode,
        approver: value.approver,
        status,
        reason: value.reason,
        actedAt: value.actedAt,
      },
    ],
  };
}

export function isCurrentApprover(
  value: any,
  userId: string | undefined,
  field?: Pick<TAltFormField, "approvalLine">
): boolean {
  if (!userId) return false;
  const v = normalizeApprovalValue(value, field);
  if (!v || v.overallStatus !== "pending") return false;
  const step = v.steps[v.currentStep];
  return step?.status === "pending" && step?.approver?.userId === userId;
}

export function defaultApprovalLine(): TApprovalLine {
  return {
    steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
    circulation: { mode: "off", users: [] },
  };
}

export function getApprovalCirculation(
  field: Pick<TAltFormField, "approvalLine"> | TAltFormField
): TApprovalCirculation {
  const c = field?.approvalLine?.circulation;
  const users = c?.users;
  const mode: TApprovalCirculationMode =
    c?.mode === "fixed" ? "fixed" : c?.mode === "pick" ? "pick" : "off";
  return {
    mode,
    users: Array.isArray(users) ? users.filter((u) => !!u?.userId) : [],
  };
}

export function formatCirculationNames(
  value: TApprovalValueV2 | null | undefined
): string {
  return (value?.circulation || [])
    .map((u) => u.userName || u.userId)
    .filter(Boolean)
    .join(", ");
}

/** 단계 승인자 표시와 같은 `이름 (아이디)` */
export function formatApproverLabel(
  u?: Pick<TApprovalApprover, "userName" | "userId"> | null
): string {
  if (!u) return "";
  const name = u.userName || u.userId || "";
  if (u.userName && u.userId && u.userName !== u.userId) {
    return `${u.userName} (${u.userId})`;
  }
  return name;
}

export function formatCirculationLabels(
  value: TApprovalValueV2 | null | undefined
): string {
  return (value?.circulation || [])
    .map((u) => formatApproverLabel(u))
    .filter(Boolean)
    .join(", ");
}

/**
 * 필수 승인 필드의 응답자 입력 오류.
 * 전부 고정이거나 고정 승인자가 있으면 값이 없어도 통과한다.
 * 지정 단계는 비울 수 있고, 채워진 지정(또는 고정)이 한 명이면 된다.
 */
export function getRequiredApprovalError(
  field: Pick<TAltFormField, "approvalLine">,
  value: any
): string | null {
  const line = getApprovalLineSteps(field);
  const pickCount = line.filter((s) => s.mode === "pick").length;
  if (pickCount === 0) return null;

  const hasFixedApprover = line.some(
    (s) => s.mode === "fixed" && !!s.approver?.userId
  );
  if (hasFixedApprover) return null;

  if (value?.version === 2 && Array.isArray(value.steps)) {
    const filledPick = value.steps.some(
      (s: { mode?: string; approver?: { userId?: string } }) =>
        s.mode !== "fixed" && !!s.approver?.userId
    );
    if (filledPick) return null;
    return "승인자를 한 명 이상 선택해주세요.";
  }
  if (value?.approver?.userId) return null;
  return "승인자를 한 명 이상 선택해주세요.";
}
