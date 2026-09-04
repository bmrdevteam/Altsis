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

function pickApproverFromSubmit(def, lineIndex, lineSteps, submitted) {
  if (def.mode === "fixed") {
    return def.approver || null;
  }

  const submittedSteps = Array.isArray(submitted?.steps)
    ? submitted.steps
    : null;
  if (submittedSteps) {
    const atIndex = submittedSteps[lineIndex];
    if (atIndex?.mode !== "fixed" && atIndex?.approver?.userId) {
      return atIndex.approver;
    }
    const pickIndex =
      lineSteps.slice(0, lineIndex + 1).filter((s) => s.mode === "pick")
        .length - 1;
    const submittedPicks = submittedSteps.filter((s) => s.mode !== "fixed");
    const fromPickSlot = submittedPicks[pickIndex];
    return fromPickSlot?.approver?.userId ? fromPickSlot.approver : null;
  }

  if (submitted?.approver?.userId) {
    const pickIndex =
      lineSteps.slice(0, lineIndex + 1).filter((s) => s.mode === "pick")
        .length - 1;
    if (pickIndex === 0) return submitted.approver;
  }
  return null;
}

/**
 * Dedupe by userId. Drops entries without userId.
 * @param {any[]} users
 * @returns {{ user: any, userId: string, userName: string }[]}
 */
export function uniqueApproverList(users) {
  const seen = new Set();
  const out = [];
  for (const u of users || []) {
    if (!u?.userId || seen.has(u.userId)) continue;
    seen.add(u.userId);
    out.push({
      user: u.user,
      userId: u.userId,
      userName: u.userName || "",
    });
  }
  return out;
}

export function getApprovalCirculation(field) {
  const c = field?.approvalLine?.circulation;
  const users = c?.users;
  const mode =
    c?.mode === "fixed" ? "fixed" : c?.mode === "pick" ? "pick" : "off";
  return {
    mode,
    users: Array.isArray(users) ? users.filter((u) => !!u?.userId) : [],
  };
}

export function getCirculationConfig(field) {
  const c = field?.circulation;
  const users = c?.users;
  const mode =
    c?.mode === "fixed" ? "fixed" : c?.mode === "off" ? "off" : "pick";
  return {
    mode,
    users: Array.isArray(users) ? users.filter((u) => !!u?.userId) : [],
  };
}

/**
 * off/missing → []. Fixed: form users. Pick: submitted list (deduped).
 * Nested on an approval field.
 * @param {object} field
 * @param {any} submitted
 */
export function resolveCirculation(field, submitted) {
  const circ = field?.approvalLine?.circulation;
  if (circ?.mode === "fixed") {
    return uniqueApproverList(circ?.users);
  }
  if (circ?.mode === "pick") {
    return uniqueApproverList(submitted?.circulation);
  }
  return [];
}

export function buildCirculationOnSubmit(field, submitted) {
  const cfg = getCirculationConfig(field);
  if (cfg.mode === "fixed") {
    return uniqueApproverList(cfg.users);
  }
  if (cfg.mode === "pick") {
    return uniqueApproverList(Array.isArray(submitted) ? submitted : []);
  }
  return [];
}

/**
 * @returns {string|null} error message
 */
export function validateCirculationSubmit(field, submitted) {
  const cfg = getCirculationConfig(field);
  if (cfg.mode === "fixed" && !cfg.users.some((u) => u?.userId)) {
    return `${field.label || "회람"}: 고정 회람자가 설정되지 않았습니다.`;
  }
  if (cfg.mode === "pick" && field.required) {
    const list = uniqueApproverList(Array.isArray(submitted) ? submitted : []);
    if (list.length === 0) {
      return `${field.label || "회람"}: 회람자를 한 명 이상 선택해주세요.`;
    }
  }
  return null;
}

/** Snapshot lists on the stored row (new fields + nested approval). */
export function collectStoredCirculatees(form, rowData) {
  const out = [];
  for (const field of form?.fields || []) {
    const fid = field._id != null ? String(field._id) : "";
    const value = rowData?.[fid];
    if (field.type === "approval" && Array.isArray(value?.circulation)) {
      out.push(...value.circulation);
    }
    if (field.type === "circulation") {
      const list = Array.isArray(value) ? value : [];
      out.push(...list);
    }
  }
  return uniqueApproverList(out);
}

export function isStoredCirculatee(form, rowData, userId) {
  if (!userId) return false;
  return collectStoredCirculatees(form, rowData).some(
    (u) => u?.userId === userId
  );
}

export function isCirculatee(value, userId) {
  if (!userId) return false;
  const list = value?.circulation;
  if (!Array.isArray(list)) return false;
  return list.some((u) => u?.userId === userId);
}

/** Mongo $or fragments: current approver, any step approver, nested/new circulatee */
export function buildApprovalAccessOr(form, userId) {
  const conditions = [];
  if (!userId) return conditions;
  for (const field of form?.fields || []) {
    const fid = field._id != null ? String(field._id) : "";
    if (!fid) continue;
    if (field.type === "approval") {
      conditions.push({ [`data.${fid}.currentApproverUserId`]: userId });
      conditions.push({ [`data.${fid}.approver.userId`]: userId });
      conditions.push({ [`data.${fid}.circulation.userId`]: userId });
    }
    if (field.type === "circulation") {
      conditions.push({ [`data.${fid}.userId`]: userId });
    }
  }
  return conditions;
}

/**
 * Build initial v2 approval value at submit time.
 * Empty pick steps are omitted. If nobody remains, the line is auto-approved.
 * @param {object} field
 * @param {any} submitted - client payload (v1 or partial v2)
 */
export function buildApprovalOnSubmit(field, submitted) {
  const lineSteps = getApprovalLineSteps(field);
  const steps = lineSteps
    .map((def, i) => {
      const approver = pickApproverFromSubmit(def, i, lineSteps, submitted);
      return {
        order: def.order,
        label: def.label,
        mode: def.mode,
        approver,
        status: "waiting",
        reason: undefined,
        actedAt: undefined,
      };
    })
    .filter((s) => s.approver?.userId);

  const circulation = resolveCirculation(field, submitted);

  if (steps.length === 0) {
    return {
      version: 2,
      currentStep: 0,
      overallStatus: "approved",
      status: "approved",
      approver: undefined,
      currentApproverUserId: undefined,
      reason: undefined,
      steps: [],
      circulation,
    };
  }

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
    circulation,
  };
}

/**
 * Validate submit payload. Fixed steps must have a form approver.
 * Empty pick steps are skipped; a required field needs at least one remaining approver.
 * @returns {string|null} error message
 */
export function validateApprovalSubmit(field, submitted) {
  const lineSteps = getApprovalLineSteps(field);
  for (const s of lineSteps) {
    if (s.mode === "fixed" && !s.approver?.userId) {
      return `${field.label || "승인"}: 고정 승인자가 설정되지 않았습니다.`;
    }
  }

  const built = buildApprovalOnSubmit(field, submitted);
  if (!built) return `${field.label || "승인"}: 결재선을 확인할 수 없습니다.`;
  const hasApprover = built.steps.some((s) => s.approver?.userId);
  if (!hasApprover && field.required) {
    return `${field.label || "승인"}: 승인자를 한 명 이상 선택해주세요.`;
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
      circulation: v.circulation,
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
      circulation: v.circulation,
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
    circulation: v.circulation,
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
