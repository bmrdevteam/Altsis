/**
 * Approval line (결재선) helpers — shared semantics for Alt Form approval fields.
 * Row value v2 shape + legacy v1 { approver, status, reason } normalization.
 */

/**
 * @param {object} field - AltForm field (type approval)
 * @returns {{ order: number, label: string, mode: 'fixed'|'pick', approver?: object }[]}
 */
export function getApprovalLineSteps(field) {
  const steps = field?.approvalLine?.steps;
  if (Array.isArray(steps) && steps.length > 0) {
    return steps
      .map((s, i) => ({
        order: typeof s.order === "number" ? s.order : i,
        label: s.label || `${i + 1}차 승인`,
        mode: s.mode === "fixed" ? "fixed" : "pick",
        approver: s.approver || undefined,
      }))
      .sort((a, b) => a.order - b.order);
  }
  // 레거시: 결재선 없음 → 1단계 지정
  return [{ order: 0, label: "1차 승인", mode: "pick" }];
}

/**
 * Normalize any stored approval cell value to v2.
 * @param {any} value
 * @param {object} [field]
 */
export function normalizeApprovalValue(value, field) {
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
    };
  }

  // v1 → v2
  const lineSteps = getApprovalLineSteps(field || {});
  const step0 = lineSteps[0] || {
    order: 0,
    label: "1차 승인",
    mode: "pick",
  };
  const status = value.status || "pending";
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

/**
 * Build initial v2 approval value at submit time.
 * @param {object} field
 * @param {any} submitted - client payload (v1 or partial v2)
 */
export function buildApprovalOnSubmit(field, submitted) {
  const lineSteps = getApprovalLineSteps(field);
  const pickApprovers = [];

  if (submitted?.version === 2 && Array.isArray(submitted.steps)) {
    for (const s of submitted.steps) {
      if (s?.approver?.userId) pickApprovers.push(s.approver);
    }
  } else if (submitted?.approver?.userId) {
    pickApprovers.push(submitted.approver);
  }

  let pickIdx = 0;
  const steps = lineSteps.map((def) => {
    let approver = null;
    if (def.mode === "fixed") {
      approver = def.approver || null;
    } else {
      approver = pickApprovers[pickIdx] || null;
      pickIdx += 1;
    }
    return {
      order: def.order,
      label: def.label,
      mode: def.mode,
      approver,
      status: "waiting",
      reason: undefined,
      actedAt: undefined,
    };
  });

  if (steps.length === 0) {
    return null;
  }

  // first step becomes pending
  steps[0].status = "pending";

  const first = steps[0];
  return {
    version: 2,
    currentStep: 0,
    overallStatus: "pending",
    status: "pending",
    approver: first.approver,
    currentApproverUserId: first.approver?.userId,
    reason: undefined,
    steps,
  };
}

/**
 * Validate submit payload has approvers for all pick steps.
 * @returns {string|null} error message
 */
export function validateApprovalSubmit(field, submitted) {
  const lineSteps = getApprovalLineSteps(field);
  const pickCount = lineSteps.filter((s) => s.mode === "pick").length;
  if (pickCount === 0) {
    // all fixed — ensure fixed have approvers
    for (const s of lineSteps) {
      if (!s.approver?.userId) {
        return `${field.label || "승인"}: 고정 승인자가 설정되지 않았습니다.`;
      }
    }
    return null;
  }

  const built = buildApprovalOnSubmit(field, submitted);
  if (!built) return `${field.label || "승인"}: 결재선을 확인할 수 없습니다.`;
  for (const s of built.steps) {
    if (!s.approver?.userId) {
      return `${field.label || "승인"}: 「${s.label}」승인자를 선택해주세요.`;
    }
  }
  return null;
}

export function isCurrentApprover(value, userId, field) {
  const v = normalizeApprovalValue(value, field);
  if (!v || v.overallStatus !== "pending") return false;
  const step = v.steps[v.currentStep];
  return step?.status === "pending" && step?.approver?.userId === userId;
}

/**
 * Apply approve/reject for current user.
 * @returns {{ ok: true, value: object, nextApprover?: object, finished: boolean } | { ok: false, message: string }}
 */
export function applyApprovalAction(value, field, userId, status, reason) {
  const v = normalizeApprovalValue(value, field);
  if (!v) return { ok: false, message: "승인 데이터가 없습니다." };
  if (v.overallStatus !== "pending") {
    return { ok: false, message: "이미 처리된 결재입니다." };
  }
  const idx = v.currentStep;
  const step = v.steps[idx];
  if (!step || step.approver?.userId !== userId) {
    return { ok: false, message: "현재 결재 권한이 없습니다." };
  }
  if (step.status !== "pending") {
    return { ok: false, message: "이미 처리된 단계입니다." };
  }
  if (status !== "approved" && status !== "rejected") {
    return { ok: false, message: "잘못된 승인 상태입니다." };
  }

  const now = new Date().toISOString();
  const steps = v.steps.map((s, i) =>
    i === idx
      ? { ...s, status, reason: reason || undefined, actedAt: now }
      : s
  );

  if (status === "rejected") {
    const next = {
      version: 2,
      currentStep: idx,
      overallStatus: "rejected",
      status: "rejected",
      approver: step.approver,
      currentApproverUserId: step.approver?.userId,
      reason: reason || undefined,
      steps,
    };
    return { ok: true, value: next, finished: true, nextApprover: null };
  }

  // approved
  const nextIdx = idx + 1;
  if (nextIdx >= steps.length) {
    const next = {
      version: 2,
      currentStep: idx,
      overallStatus: "approved",
      status: "approved",
      approver: step.approver,
      currentApproverUserId: step.approver?.userId,
      reason: reason || undefined,
      steps,
    };
    return { ok: true, value: next, finished: true, nextApprover: null };
  }

  steps[nextIdx] = { ...steps[nextIdx], status: "pending" };
  const nextApprover = steps[nextIdx].approver;
  const next = {
    version: 2,
    currentStep: nextIdx,
    overallStatus: "pending",
    status: "pending",
    approver: nextApprover,
    currentApproverUserId: nextApprover?.userId,
    reason: undefined,
    steps,
  };
  return { ok: true, value: next, finished: false, nextApprover };
}

/** Mongo $or conditions: rows where user is current approver (legacy + v2) */
export function buildApproverQueryConditions(fieldIds, userId) {
  const conditions = [];
  for (const fid of fieldIds) {
    conditions.push({ [`data.${fid}.currentApproverUserId`]: userId });
    conditions.push({
      [`data.${fid}.approver.userId`]: userId,
      $or: [
        { [`data.${fid}.version`]: { $ne: 2 } },
        { [`data.${fid}.overallStatus`]: "pending" },
        { [`data.${fid}.status`]: "pending" },
      ],
    });
    // simpler legacy:
    conditions.push({ [`data.${fid}.approver.userId`]: userId });
  }
  return conditions;
}
