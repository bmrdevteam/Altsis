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

export type TApprovalLine = {
  steps: TApprovalLineStepDef[];
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
  };
}
