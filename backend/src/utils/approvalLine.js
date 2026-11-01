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

function normalizeApprover(user) {
  if (!user?.userId) return null;
  return {
    user: user.user,
    userId: String(user.userId),
    userName: user.userName || "",
  };
}

/**
 * Resolve a submitted user against a server-owned candidate collection.
 * Map values replace client identity fields; Set values only validate legacy callers.
 */
function resolveCandidate(user, candidates) {
  const normalized = normalizeApprover(user);
  if (!normalized) return null;
  if (!candidates) return normalized;
  if (candidates instanceof Map) {
    return normalizeApprover(candidates.get(normalized.userId));
  }
  return candidates.has?.(normalized.userId) ? normalized : null;
}

function resolveCandidateList(users, candidates) {
  const submitted = Array.isArray(users) ? users : [];
  const resolved = [];
  let hasInvalid = false;
  for (const user of submitted.slice(0, MAX_GROUP_MEMBERS)) {
    if (!user?.userId) continue;
    const candidate = resolveCandidate(user, candidates);
    if (!candidate) {
      hasInvalid = true;
      continue;
    }
    resolved.push(candidate);
  }
  return {
    users: uniqueApproverList(resolved),
    hasInvalid,
    tooMany: submitted.length > MAX_GROUP_MEMBERS,
  };
}

/** Circulatees in `next` that were not in `prev` (by userId). */
export function addedCirculatees(prev, next) {
  const had = new Set(
    (Array.isArray(prev) ? prev : [])
      .map((u) => u?.userId)
      .filter(Boolean)
      .map(String)
  );
  return uniqueApproverList(next).filter(
    (u) => u.user && u.userId && !had.has(String(u.userId))
  );
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
    const normalized = normalizeApprover(u);
    if (!normalized || seen.has(normalized.userId)) continue;
    seen.add(normalized.userId);
    out.push({
      user: normalized.user,
      userId: normalized.userId,
      userName: normalized.userName,
    });
  }
  return out;
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
export function resolveCirculation(field, submitted, candidates) {
  const circ = field?.approvalLine?.circulation;
  if (circ?.mode === "fixed") {
    return resolveCandidateList(circ?.users, candidates).users;
  }
  if (circ?.mode === "pick") {
    return resolveCandidateList(submitted?.circulation, candidates).users;
  }
  return [];
}

export function buildCirculationOnSubmit(field, submitted, options = {}) {
  const cfg = getCirculationConfig(field);
  if (cfg.mode === "fixed") {
    return resolveCandidateList(cfg.users, options.candidates).users;
  }
  if (cfg.mode === "pick") {
    return resolveCandidateList(submitted, options.candidates).users;
  }
  return [];
}

/**
 * @returns {string|null} error message
 */
export function validateCirculationSubmit(field, submitted, options = {}) {
  const cfg = getCirculationConfig(field);
  if (cfg.mode === "fixed" && !cfg.users.some((u) => u?.userId)) {
    return `${field.label || "회람"}: 고정 회람자가 설정되지 않았습니다.`;
  }
  if (cfg.mode === "fixed") {
    const resolved = resolveCandidateList(cfg.users, options.candidates);
    if (resolved.hasInvalid) {
      return `${field.label || "회람"}: 현재 보드에 없는 회람자가 설정되어 있습니다.`;
    }
  }
  if (cfg.mode === "pick") {
    const resolved = resolveCandidateList(submitted, options.candidates);
    if (resolved.tooMany) {
      return `${field.label || "회람"}: 회람자는 ${MAX_GROUP_MEMBERS}명까지 지정할 수 있습니다.`;
    }
    if (resolved.hasInvalid) {
      return `${field.label || "회람"}: 지정할 수 없는 회람자가 있습니다.`;
    }
    if (field.required && resolved.users.length === 0) {
      return `${field.label || "회람"}: 회람자를 한 명 이상 선택해주세요.`;
    }
  }
  return null;
}

function rowFieldValue(rowData, fid) {
  if (!rowData || !fid) return undefined;
  if (typeof rowData.get === "function") {
    const fromMap = rowData.get(fid);
    if (fromMap !== undefined) return fromMap;
  }
  return rowData[fid];
}

/** Snapshot lists on the stored row (new fields + nested approval). */
export function collectStoredCirculatees(form, rowData) {
  const out = [];
  for (const field of form?.fields || []) {
    const fid = field._id != null ? String(field._id) : "";
    const value = rowFieldValue(rowData, fid);
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

/**
 * Final approve/reject recipients: submitter + circulatees.
 * Drops missing user ObjectId, excluded ids, and duplicates.
 */
export function recipientsForFinalApprovalResult({
  respondent,
  circulatees,
  excludeUserIds = [],
} = {}) {
  const skip = new Set(
    (excludeUserIds || []).filter(Boolean).map((id) => String(id))
  );
  const out = [];
  const seen = new Set();
  const push = (u) => {
    if (!u?.user || !u.userId) return;
    const id = String(u.userId);
    if (skip.has(id) || seen.has(id)) return;
    seen.add(id);
    out.push({
      user: u.user,
      userId: u.userId,
      userName: u.userName || "",
    });
  };
  push(respondent);
  for (const u of circulatees || []) push(u);
  return out;
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

export const MAX_APPROVAL_GROUPS = 20;
export const MAX_GROUP_MEMBERS = 50;

export function formHasApprovalGroups(form) {
  return Array.isArray(form?.approvalGroups) && form.approvalGroups.length > 0;
}

export function sanitizeApprovalGroups(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seenIds = new Set();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if (out.length >= MAX_APPROVAL_GROUPS) break;
    let id = String(item.id || "").trim();
    if (!id || seenIds.has(id)) {
      id = `ag_${out.length}_${Date.now()}`;
    }
    seenIds.add(id);
    const kind =
      item.kind === "approver" || item.kind === "circulation"
        ? item.kind
        : "both";
    const members = [];
    const seenUsers = new Set();
    const rawMembers = Array.isArray(item.members) ? item.members : [];
    for (const m of rawMembers) {
      if (members.length >= MAX_GROUP_MEMBERS) break;
      const user = m?.user || m;
      const userId = user?.userId ? String(user.userId) : "";
      if (!userId || seenUsers.has(userId)) continue;
      seenUsers.add(userId);
      members.push({
        label: String(m?.label || "").trim().slice(0, 200),
        user: {
          user: String(user.user || ""),
          userId,
          userName: String(user.userName || userId),
        },
      });
    }
    out.push({
      id,
      title: String(item.title || "").trim().slice(0, 200) || "그룹",
      kind,
      members,
    });
  }
  return out;
}

export function isGroupSourcedLine(submitted, options = {}) {
  return (
    submitted?.lineSource === "group" && options.hasApprovalGroups === true
  );
}

function finalizeBuiltSteps(steps, circulation) {
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

function buildGroupSourcedSteps(submitted, options = {}) {
  const raw = Array.isArray(submitted?.steps) ? submitted.steps : [];
  if (raw.length > MAX_GROUP_MEMBERS) return { error: "too_many" };
  if (raw.some((s) => s?.mode === "fixed")) return { error: "not_pick" };
  const candidates = options.approvalCandidates || options.candidateIds;
  const steps = [];
  for (let i = 0; i < raw.length; i += 1) {
    const s = raw[i];
    const submittedApprover = normalizeApprover(s?.approver);
    const approver = resolveCandidate(submittedApprover, candidates);
    if (submittedApprover && !approver) {
      return { error: "not_candidate" };
    }
    steps.push({
      order: i,
      label: String(s?.label || "").trim() || `${i + 1}차 승인`,
      mode: "pick",
      approver,
      status: "waiting",
      reason: undefined,
      actedAt: undefined,
    });
  }
  return { steps: steps.filter((s) => s.approver?.userId) };
}

/**
 * Build initial v2 approval value at submit time.
 * Empty pick steps are omitted. If nobody remains, the line is auto-approved.
 * Group-sourced lines (`lineSource: "group"`) replace the form line when the
 * form has approvalGroups.
 * @param {object} field
 * @param {any} submitted - client payload (v1 or partial v2)
 * @param {{
 *   hasApprovalGroups?: boolean,
 *   approvalCandidates?: Map<string, object>|Set<string>,
 *   circulationCandidates?: Map<string, object>|Set<string>,
 *   candidateIds?: Set<string>
 * }} [options]
 */
export function buildApprovalOnSubmit(field, submitted, options = {}) {
  const circulation = resolveCirculation(
    field,
    submitted,
    options.circulationCandidates
  );
  if (isGroupSourcedLine(submitted, options)) {
    const built = buildGroupSourcedSteps(submitted, options);
    if (built.error) {
      return finalizeBuiltSteps([], circulation);
    }
    return finalizeBuiltSteps(built.steps, circulation);
  }

  const lineSteps = getApprovalLineSteps(field);
  const candidates = options.approvalCandidates || options.candidateIds;
  const steps = lineSteps
    .map((def, i) => {
      const picked = pickApproverFromSubmit(def, i, lineSteps, submitted);
      const approver =
        def.mode === "fixed"
          ? normalizeApprover(picked)
          : resolveCandidate(picked, candidates);
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

  return finalizeBuiltSteps(steps, circulation);
}

/**
 * Validate submit payload. Fixed steps must have a form approver.
 * Empty pick steps are skipped; a required field needs at least one remaining approver.
 * @returns {string|null} error message
 */
export function validateApprovalSubmit(field, submitted, options = {}) {
  const nestedCirculation = field?.approvalLine?.circulation;
  if (
    nestedCirculation?.mode === "fixed" ||
    nestedCirculation?.mode === "pick"
  ) {
    const resolved = resolveCandidateList(
      nestedCirculation.mode === "fixed"
        ? nestedCirculation.users
        : submitted?.circulation,
      options.circulationCandidates
    );
    if (resolved.tooMany) {
      return `${field.label || "승인"}: 회람자는 ${MAX_GROUP_MEMBERS}명까지 지정할 수 있습니다.`;
    }
    if (resolved.hasInvalid) {
      return nestedCirculation.mode === "fixed"
        ? `${field.label || "승인"}: 현재 보드에 없는 회람자가 설정되어 있습니다.`
        : `${field.label || "승인"}: 지정할 수 없는 회람자가 있습니다.`;
    }
  }

  if (isGroupSourcedLine(submitted, options)) {
    const builtGroup = buildGroupSourcedSteps(submitted, options);
    if (builtGroup.error === "too_many" || builtGroup.error === "not_pick") {
      return `${field.label || "승인"}: 결재선을 확인할 수 없습니다.`;
    }
    if (builtGroup.error === "not_candidate") {
      return `${field.label || "승인"}: 지정할 수 없는 승인자가 있습니다.`;
    }
    const built = buildApprovalOnSubmit(field, submitted, options);
    if (!built) return `${field.label || "승인"}: 결재선을 확인할 수 없습니다.`;
    const hasApprover = built.steps.some((s) => s.approver?.userId);
    if (!hasApprover && field.required) {
      return `${field.label || "승인"}: 승인자를 한 명 이상 선택해주세요.`;
    }
    return null;
  }

  const lineSteps = getApprovalLineSteps(field);
  const candidates = options.approvalCandidates || options.candidateIds;
  for (let i = 0; i < lineSteps.length; i += 1) {
    const s = lineSteps[i];
    if (s.mode === "fixed" && !s.approver?.userId) {
      return `${field.label || "승인"}: 고정 승인자가 설정되지 않았습니다.`;
    }
    if (s.mode === "pick") {
      const picked = pickApproverFromSubmit(s, i, lineSteps, submitted);
      if (picked?.userId && !resolveCandidate(picked, candidates)) {
        return `${field.label || "승인"}: 지정할 수 없는 승인자가 있습니다.`;
      }
    }
  }

  const built = buildApprovalOnSubmit(field, submitted, options);
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

function stepWasApproved(step) {
  return step?.status === "approved" && !!step?.approver?.userId;
}

/**
 * Index of the approval that can still be undone: the latest approved step,
 * and only while every later step is still untouched.
 * @returns {number}
 */
export function cancellableStepIndex(value, field) {
  const v = normalizeApprovalValue(value, field);
  if (!v?.steps?.length || v.overallStatus === "rejected") return -1;

  if (v.overallStatus === "approved") {
    const idx = v.steps.length - 1;
    if (!stepWasApproved(v.steps[idx])) return -1;
    for (let i = 0; i < idx; i += 1) {
      if (!stepWasApproved(v.steps[i])) return -1;
    }
    return idx;
  }

  if (v.overallStatus !== "pending") return -1;
  const currentIdx = v.currentStep;
  if (
    !Number.isInteger(currentIdx) ||
    currentIdx <= 0 ||
    currentIdx >= v.steps.length
  ) {
    return -1;
  }
  const current = v.steps[currentIdx];
  if (current?.status !== "pending" || current.actedAt) return -1;
  for (let i = currentIdx + 1; i < v.steps.length; i += 1) {
    const step = v.steps[i];
    if (!step || step.status !== "waiting" || step.actedAt || step.reason) {
      return -1;
    }
  }
  const prevIdx = currentIdx - 1;
  if (!stepWasApproved(v.steps[prevIdx])) return -1;
  for (let i = 0; i < prevIdx; i += 1) {
    if (!stepWasApproved(v.steps[i])) return -1;
  }
  return prevIdx;
}

/** True when this user approved the latest step and nobody after them has acted. */
export function canCancelLastApproval(value, userId, field) {
  if (!userId) return false;
  const v = normalizeApprovalValue(value, field);
  const idx = cancellableStepIndex(v, field);
  if (idx < 0) return false;
  return v.steps[idx]?.approver?.userId === userId;
}

const CANCEL_HISTORY_MAX = 20;

function sanitizeCancelHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(-CANCEL_HISTORY_MAX)) {
    if (!item || typeof item !== "object") continue;
    const entry = {
      stepIndex: Number.isInteger(item.stepIndex) ? item.stepIndex : 0,
      stepLabel: String(item.stepLabel || "").slice(0, 200),
      userId: String(item.userId || "").slice(0, 80),
      reopenedFinal: item.reopenedFinal === true,
    };
    if (typeof item.actedAt === "string" && item.actedAt.length <= 40) {
      entry.actedAt = item.actedAt;
    }
    if (typeof item.reason === "string" && item.reason) {
      entry.reason = item.reason.slice(0, 500);
    }
    if (typeof item.cancelledAt === "string" && item.cancelledAt.length <= 40) {
      entry.cancelledAt = item.cancelledAt;
    }
    out.push(entry);
  }
  return out;
}

function storedApprovalValue(previous, patch) {
  const next = {
    version: 2,
    currentStep: patch.currentStep,
    overallStatus: patch.overallStatus,
    status: patch.overallStatus,
    approver: patch.approver,
    currentApproverUserId: patch.approver?.userId,
    reason: patch.reason,
    steps: patch.steps,
    circulation: previous?.circulation,
  };
  if (previous?.lineSource === "group" || previous?.lineSource === "form") {
    next.lineSource = previous.lineSource;
  }
  const history = sanitizeCancelHistory(
    patch.cancelHistory !== undefined
      ? patch.cancelHistory
      : previous?.cancelHistory
  );
  if (history.length > 0) next.cancelHistory = history;
  return next;
}

function hasApprovalAction(value, field) {
  const v = normalizeApprovalValue(value, field);
  if (!v) return false;
  if (v.overallStatus === "approved" || v.overallStatus === "rejected") {
    return true;
  }
  return (v.steps || []).some(
    (s) => s?.status === "approved" || s?.status === "rejected" || !!s?.actedAt
  );
}

/**
 * Lock respondent edit/delete after at least one approve/reject (or skip).
 * Pending with no acted step stays unlocked. Drafts stay unlocked.
 */
export function isApprovalLocked(row, fields) {
  if (!row || row.isDraft) return false;
  for (const field of fields || []) {
    if (field?.type !== "approval") continue;
    const fid = field._id != null ? String(field._id) : "";
    if (!fid) continue;
    if (hasApprovalAction(rowFieldValue(row.data, fid), field)) return true;
  }
  return false;
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
    return {
      ok: true,
      value: storedApprovalValue(v, {
        currentStep: idx,
        overallStatus: "rejected",
        approver: step.approver,
        reason: reason || undefined,
        steps,
      }),
      finished: true,
      nextApprover: null,
    };
  }

  // approved
  const nextIdx = idx + 1;
  if (nextIdx >= steps.length) {
    return {
      ok: true,
      value: storedApprovalValue(v, {
        currentStep: idx,
        overallStatus: "approved",
        approver: step.approver,
        reason: reason || undefined,
        steps,
      }),
      finished: true,
      nextApprover: null,
    };
  }

  steps[nextIdx] = { ...steps[nextIdx], status: "pending" };
  const nextApprover = steps[nextIdx].approver;
  return {
    ok: true,
    value: storedApprovalValue(v, {
      currentStep: nextIdx,
      overallStatus: "pending",
      approver: nextApprover,
      reason: undefined,
      steps,
    }),
    finished: false,
    nextApprover,
  };
}

/**
 * Undo the latest approval and return the line to that step.
 * @returns {{ ok: true, value: object, cancelled: true, reopenedFinal: boolean, restoredStepLabel: string, withdrawnApprover: object|null } | { ok: false, message: string }}
 */
export function applyApprovalCancel(value, field, userId) {
  const v = normalizeApprovalValue(value, field);
  if (!v) return { ok: false, message: "승인 데이터가 없습니다." };
  if (!canCancelLastApproval(v, userId, field)) {
    return { ok: false, message: "승인 취소 권한이 없습니다." };
  }
  const idx = cancellableStepIndex(v, field);
  const wasFinal = v.overallStatus === "approved";
  const now = new Date().toISOString();
  const steps = v.steps.map((step) => ({ ...step }));
  const acted = steps[idx];
  const history = sanitizeCancelHistory(v.cancelHistory);
  history.push({
    stepIndex: idx,
    stepLabel: String(acted.label || "").slice(0, 200),
    userId: String(userId),
    reopenedFinal: wasFinal,
    actedAt:
      typeof acted.actedAt === "string" && acted.actedAt.length <= 40
        ? acted.actedAt
        : undefined,
    reason:
      typeof acted.reason === "string" && acted.reason
        ? acted.reason.slice(0, 500)
        : undefined,
    cancelledAt: now,
  });
  steps[idx] = {
    ...acted,
    status: "pending",
    reason: undefined,
    actedAt: undefined,
  };

  let withdrawnApprover = null;
  if (!wasFinal && steps[idx + 1]) {
    const nextStep = steps[idx + 1];
    if (nextStep.approver?.userId) withdrawnApprover = nextStep.approver;
    steps[idx + 1] = {
      ...nextStep,
      status: "waiting",
      reason: undefined,
      actedAt: undefined,
    };
  }

  return {
    ok: true,
    value: storedApprovalValue(v, {
      currentStep: idx,
      overallStatus: "pending",
      approver: steps[idx].approver,
      reason: undefined,
      steps,
      cancelHistory: history.slice(-CANCEL_HISTORY_MAX),
    }),
    cancelled: true,
    reopenedFinal: wasFinal,
    restoredStepLabel: acted.label || "",
    withdrawnApprover,
  };
}

const TITLE_SNIPPET_MAX = 40;

function sanitizeTitleSnippet(value) {
  const cleaned = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= TITLE_SNIPPET_MAX) return cleaned;
  return `${cleaned.slice(0, TITLE_SNIPPET_MAX)}…`;
}

/**
 * First short-text (type === "text") answer, by field.order.
 * @returns {string}
 */
export function firstShortTextAnswer(form, rowData) {
  const fields = [...(form?.fields || [])]
    .filter((f) => f?.type === "text")
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const first = fields[0];
  if (!first) return "";
  const fid = first._id != null ? String(first._id) : "";
  const raw = rowFieldValue(rowData, fid);
  if (typeof raw === "string") return sanitizeTitleSnippet(raw);
  if (raw != null && typeof raw === "object" && typeof raw.value === "string") {
    return sanitizeTitleSnippet(raw.value);
  }
  return "";
}

export function approvalNotificationHeadline(form, rowData) {
  return (
    firstShortTextAnswer(form, rowData) ||
    sanitizeTitleSnippet(form?.title) ||
    "양식"
  );
}

/**
 * @param {"request"|"circulation"|"approved"|"rejected"|"stepApproved"|"stepCancelled"|"approvalReopened"|"requestWithdrawn"} kind
 * @param {string} [stepLabel]
 */
export function approvalNotificationTitle(form, rowData, kind, stepLabel) {
  const head = approvalNotificationHeadline(form, rowData);
  switch (kind) {
    case "request":
      return `${head} · 승인 요청`;
    case "circulation":
      return `${head} · 회람`;
    case "approved":
      return `${head} · 승인됨`;
    case "rejected":
      return `${head} · 반려됨`;
    case "stepApproved":
      return `${head} · 「${stepLabel || "이전 단계"}」승인됨`;
    case "stepCancelled":
      return `${head} · 「${stepLabel || "이전 단계"}」승인 취소`;
    case "approvalReopened":
      return `${head} · 최종 승인 취소`;
    case "requestWithdrawn":
      return `${head} · 승인 요청 철회`;
    default:
      return head;
  }
}
