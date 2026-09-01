import { TAltForm, TAltFormField } from "types/altForm";
import { TGradeDraft } from "pages/boards/altBoard/FieldAssessmentInline";
import { getFieldRubrics } from "pages/boards/altBoard/FieldRubricPanel";

export type TAssessmentGradeDraftPayload = {
  byField?: TGradeDraft["byField"];
  final?: { comment?: string };
  fillEmptyOnly?: boolean;
};

const fieldIdOf = (field: TAltFormField) => String(field._id || "");

export const isEmptyGradeFieldDraft = (
  draft: TGradeDraft["byField"][string] | undefined
): boolean => {
  if (!draft) return true;
  if (draft.score != null && Number.isFinite(Number(draft.score))) return false;
  if (String(draft.comment || "").trim()) return false;
  if (draft.levelId) return false;
  const by = draft.byRubric || {};
  for (const entry of Object.values(by)) {
    if (entry?.levelId) return false;
    if (String(entry?.comment || "").trim()) return false;
  }
  return true;
};

const isEmptyFieldDraft = isEmptyGradeFieldDraft;

export const isEmptyGradeDraft = (
  draft: TGradeDraft | null | undefined
): boolean => {
  if (!draft) return true;
  if (String(draft.final?.comment || "").trim()) return false;
  for (const g of Object.values(draft.byField || {})) {
    if (!isEmptyGradeFieldDraft(g)) return false;
  }
  return true;
};

export const gradeDraftFromAssessment = (
  assessment:
    | {
        byField?: TGradeDraft["byField"];
        final?: { comment?: string; status?: string };
      }
    | null
    | undefined
): TGradeDraft => {
  const byField: TGradeDraft["byField"] = {};
  for (const [fid, g] of Object.entries(assessment?.byField || {})) {
    const byRubric: Record<string, { levelId?: string; comment?: string }> = {};
    for (const [rid, rg] of Object.entries(g?.byRubric || {})) {
      byRubric[rid] = {
        levelId: rg.levelId,
        comment: rg.comment,
      };
    }
    byField[fid] = {
      score: g?.score,
      levelId: g?.levelId,
      comment: g?.comment,
      byRubric: Object.keys(byRubric).length ? byRubric : undefined,
    };
  }
  return {
    byField,
    final: { comment: assessment?.final?.comment },
  };
};

/** 확정되지 않았고 채점 칸이 비어 있으면 true */
export const isAssessmentRowEmptyForGrade = (row: {
  isDraft?: boolean;
  data?: {
    _assessment?: {
      byField?: TGradeDraft["byField"];
      final?: { comment?: string; status?: string };
    };
  };
}): boolean => {
  if (row.isDraft) return false;
  const assessment = row.data?._assessment;
  if (assessment?.final?.status === "finalized") return false;
  return isEmptyGradeDraft(gradeDraftFromAssessment(assessment));
};

/**
 * AI/수동 채점 초안을 양식 루브릭·채점 방식에 맞게 정규화한다.
 */
export const normalizeAssessmentGradeDraft = (
  form: TAltForm | null | undefined,
  raw: TAssessmentGradeDraftPayload | null | undefined
): TGradeDraft => {
  const byField: TGradeDraft["byField"] = {};
  const final: TGradeDraft["final"] = {};
  if (!form || !raw || typeof raw !== "object") {
    return { byField, final };
  }

  const rawByField =
    raw.byField && typeof raw.byField === "object" ? raw.byField : {};
  const gradeFields = (form.fields || []).filter(
    (f) => f.gradingMethod && f.gradingMethod !== "none"
  );

  for (const field of gradeFields) {
    const fid = fieldIdOf(field);
    const update = rawByField[fid];
    if (!update || typeof update !== "object") continue;

    const next: TGradeDraft["byField"][string] = {};
    if (update.comment !== undefined) {
      next.comment = String(update.comment ?? "");
    }

    if (field.gradingMethod === "manual_score" || field.gradingMethod === "completion") {
      const max = Number(field.points) || 0;
      if (update.score !== undefined && update.score !== null) {
        const s = Number(update.score);
        if (Number.isFinite(s)) {
          next.score = Math.max(0, Math.min(max, s));
        }
      }
    } else if (field.gradingMethod === "rubric") {
      const rubrics = getFieldRubrics(field, form.rubrics);
      const allowed = new Map<string, Set<string>>();
      for (const r of rubrics) {
        allowed.set(
          r.id,
          new Set((r.levels || []).map((l) => String(l.id)))
        );
      }
      const byRubric: Record<string, { levelId?: string; comment?: string }> =
        {};
      const incoming = update.byRubric || {};
      for (const [rid, entry] of Object.entries(incoming)) {
        if (!allowed.has(rid) || !entry || typeof entry !== "object") continue;
        const levelSet = allowed.get(rid)!;
        const levelId = entry.levelId ? String(entry.levelId) : undefined;
        byRubric[rid] = {
          levelId: levelId && levelSet.has(levelId) ? levelId : undefined,
          comment:
            entry.comment !== undefined ? String(entry.comment ?? "") : undefined,
        };
      }
      // 단일 루브릭 + 최상위 levelId 호환
      if (
        rubrics.length === 1 &&
        update.levelId &&
        !byRubric[rubrics[0].id]?.levelId
      ) {
        const rid = rubrics[0].id;
        const levelSet = allowed.get(rid)!;
        const levelId = String(update.levelId);
        if (levelSet.has(levelId)) {
          byRubric[rid] = {
            ...(byRubric[rid] || {}),
            levelId,
          };
        }
      }
      if (Object.keys(byRubric).length) next.byRubric = byRubric;
    }

    if (
      next.score != null ||
      next.comment !== undefined ||
      (next.byRubric && Object.keys(next.byRubric).length)
    ) {
      byField[fid] = next;
    }
  }

  if (raw.final && typeof raw.final === "object") {
    if (raw.final.comment !== undefined) {
      final.comment = String(raw.final.comment ?? "");
    }
  }

  return { byField, final };
};

/**
 * 정규화된 초안을 현재 gradeDraft에 병합한다.
 */
export const mergeAssessmentGradeDraft = (
  current: TGradeDraft,
  incoming: TGradeDraft,
  opts?: { fillEmptyOnly?: boolean }
): TGradeDraft => {
  const fillEmptyOnly = !!opts?.fillEmptyOnly;
  const byField: TGradeDraft["byField"] = { ...(current.byField || {}) };

  for (const [fid, patch] of Object.entries(incoming.byField || {})) {
    const prev = byField[fid];
    if (fillEmptyOnly && !isEmptyFieldDraft(prev)) continue;

    const next = { ...(prev || {}) };
    if (patch.score !== undefined) next.score = patch.score;
    if (patch.comment !== undefined) next.comment = patch.comment;
    if (patch.levelId !== undefined) next.levelId = patch.levelId;
    if (patch.byRubric) {
      next.byRubric = { ...(next.byRubric || {}) };
      for (const [rid, rg] of Object.entries(patch.byRubric)) {
        const prevRg = next.byRubric[rid] || {};
        if (
          fillEmptyOnly &&
          (prevRg.levelId || String(prevRg.comment || "").trim())
        ) {
          continue;
        }
        next.byRubric[rid] = {
          ...prevRg,
          ...(rg.levelId !== undefined ? { levelId: rg.levelId } : {}),
          ...(rg.comment !== undefined ? { comment: rg.comment } : {}),
        };
      }
    }
    byField[fid] = next;
  }

  const final = { ...(current.final || {}) };
  if (incoming.final?.comment !== undefined) {
    if (
      !fillEmptyOnly ||
      !String(current.final?.comment || "").trim()
    ) {
      final.comment = incoming.final.comment;
    }
  }

  return { byField, final };
};
