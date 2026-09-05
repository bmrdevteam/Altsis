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
  /** 제출자가 양식 그룹으로 결재선을 바꾼 경우 */
  lineSource?: "form" | "group";
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

export type TApprovalComposeRow =
  | {
      kind: "pick";
      key: string;
      label: string;
      pickIndex: number;
      selected?: TApprovalApprover;
    }
  | {
      kind: "fixed";
      key: string;
      label: string;
      approver?: TApprovalApprover;
    };

/** 제출 전 결재 칸: 고정·지정을 결재선 순서로 나눈다. */
export function getApprovalComposeRows(
  steps: TApprovalLineStepDef[],
  picks: Record<number, TApprovalApprover | undefined> = {}
): TApprovalComposeRow[] {
  let pickIndex = 0;
  return steps.map((s, i) => {
    if (s.mode === "fixed") {
      return {
        kind: "fixed" as const,
        key: `fixed-${s.order}-${i}`,
        label: s.label,
        approver: s.approver,
      };
    }
    const idx = pickIndex;
    pickIndex += 1;
    return {
      kind: "pick" as const,
      key: `pick-${s.order}-${idx}`,
      label: s.label,
      pickIndex: idx,
      selected: picks[idx],
    };
  });
}

export function getEffectiveApprovalLineSteps(
  field: Pick<TAltFormField, "approvalLine"> | TAltFormField,
  value?: { lineSource?: string; steps?: Array<Partial<TApprovalLineStepDef>> }
): TApprovalLineStepDef[] {
  if (value?.lineSource === "group" && Array.isArray(value.steps)) {
    return value.steps.map((s, i) => ({
      order: typeof s?.order === "number" ? s.order : i,
      label: s?.label || `${i + 1}차 승인`,
      mode: "pick" as TApprovalStepMode,
      approver: s?.approver,
    }));
  }
  return getApprovalLineSteps(field);
}

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

function approvalFieldValue(
  data: Record<string, any> | Map<string, any> | null | undefined,
  fid: string
) {
  if (!data || !fid) return undefined;
  if (typeof (data as Map<string, any>).get === "function") {
    const fromMap = (data as Map<string, any>).get(fid);
    if (fromMap !== undefined) return fromMap;
  }
  return (data as Record<string, any>)[fid];
}

function hasApprovalAction(
  value: any,
  field?: Pick<TAltFormField, "approvalLine">
): boolean {
  const v = normalizeApprovalValue(value, field);
  if (!v) return false;
  if (v.overallStatus === "approved" || v.overallStatus === "rejected") {
    return true;
  }
  return (v.steps || []).some(
    (s) => s?.status === "approved" || s?.status === "rejected" || !!s?.actedAt
  );
}

/** 한 번이라도 승인·반려(또는 결재 생략)되면 응답자 수정·삭제 잠금. 대기만이면 잠기지 않음. */
export function isApprovalLocked(
  row:
    | {
        isDraft?: boolean;
        data?: Record<string, any> | Map<string, any> | null;
      }
    | null
    | undefined,
  fields:
    | Array<Pick<TAltFormField, "type" | "_id" | "approvalLine">>
    | undefined
): boolean {
  if (!row || row.isDraft) return false;
  for (const field of fields || []) {
    if (field?.type !== "approval") continue;
    const fid = field._id != null ? String(field._id) : "";
    if (!fid) continue;
    if (hasApprovalAction(approvalFieldValue(row.data, fid), field)) {
      return true;
    }
  }
  return false;
}

export function defaultApprovalLine(): TApprovalLine {
  return {
    steps: [{ order: 0, label: "1차 승인", mode: "pick" }],
  };
}

export function defaultCirculation(): TApprovalCirculation {
  return { mode: "pick", users: [] };
}

export function uniqueApproverList(
  users: Array<Partial<TApprovalApprover> | null | undefined> | undefined
): TApprovalApprover[] {
  const seen = new Set<string>();
  const out: TApprovalApprover[] = [];
  for (const u of users || []) {
    if (!u?.userId || seen.has(u.userId)) continue;
    seen.add(u.userId);
    out.push({
      user: String(u.user || ""),
      userId: u.userId,
      userName: u.userName || u.userId,
    });
  }
  return out;
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

/** Dedicated circulation field config. Missing mode defaults to pick. */
export function getCirculationConfig(
  field: Pick<TAltFormField, "circulation"> | TAltFormField
): TApprovalCirculation {
  const c = field?.circulation;
  const users = c?.users;
  const mode: TApprovalCirculationMode =
    c?.mode === "fixed" ? "fixed" : c?.mode === "off" ? "off" : "pick";
  return {
    mode,
    users: Array.isArray(users) ? users.filter((u) => !!u?.userId) : [],
  };
}

export function formHasCirculationField(
  fields: Array<{ type?: string }> | undefined
): boolean {
  return (fields || []).some((f) => f.type === "circulation");
}

const newCirculationFieldId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `circ_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/**
 * If an approval field still has nested circulation and the form has no
 * circulation field, insert a sibling after that approval and turn nested off.
 */
export function liftNestedCirculationFields(
  fields: TAltFormField[]
): TAltFormField[] {
  if (!Array.isArray(fields) || fields.length === 0) return fields;
  if (formHasCirculationField(fields)) return fields;

  const next: TAltFormField[] = [];
  let changed = false;
  for (const field of fields) {
    if (field.type !== "approval") {
      next.push(field);
      continue;
    }
    const nested = getApprovalCirculation(field);
    if (nested.mode === "off") {
      next.push(field);
      continue;
    }
    changed = true;
    next.push({
      ...field,
      approvalLine: {
        ...(field.approvalLine || { steps: [] }),
        steps: field.approvalLine?.steps || [],
        circulation: { mode: "off", users: [] },
      },
    });
    next.push({
      _id: newCirculationFieldId(),
      label: "회람",
      type: "circulation",
      permission: "respondent",
      visibleToRespondent: false,
      required: false,
      order: (typeof field.order === "number" ? field.order : next.length) + 1,
      circulation: { mode: nested.mode, users: nested.users },
    });
  }
  if (!changed) return fields;
  return next.map((f, i) => ({ ...f, order: i }));
}

export function formatCirculationUserList(
  users: TApprovalApprover[] | undefined
): string {
  return (users || [])
    .map((u) => formatApproverLabel(u))
    .filter(Boolean)
    .join(", ");
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
  if (value?.lineSource === "group" && Array.isArray(value.steps)) {
    const filledPick = value.steps.some(
      (s: { approver?: { userId?: string } }) => !!s?.approver?.userId
    );
    return filledPick ? null : "승인자를 한 명 이상 선택해주세요.";
  }
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
