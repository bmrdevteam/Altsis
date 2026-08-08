import { useState } from "react";
import { TAlterPageContext } from "contexts/alterContext";
import { isEmptyEval } from "utils/evaluationCsv";
import { redactImagesForPreview } from "utils/formResponseSlots";
import ApplyDraftButton from "./ApplyDraftButton";
import DraftResultCard, { draftMetaVariantClass } from "./DraftResultCard";
import {
  activityFormTypeLabel,
  docTypeLabel,
  REVIEW_LEVEL_LABEL,
  reviewLevelToVariant,
} from "./draftUi";
import {
  isActivityDraft,
  isArchiveDraft,
  isAssessmentGradeDraft,
  isDocumentDraft,
  isEvalDraft,
  isFormResponseDraft,
  isSyllabusDraft,
  TAlterDraftResult,
  TAlterDocumentReviewResult,
} from "./types";
import style from "../Alter.module.scss";

type Props = {
  msgId: string;
  draft?: TAlterDraftResult | null;
  review?: TAlterDocumentReviewResult | null;
  applied: boolean;
  pageContext: TAlterPageContext | null;
  onApply: (msgId: string, draft: TAlterDraftResult) => void;
};

const PREVIEW_LIMIT = 900;
const DOC_PREVIEW_LIMIT = 1200;

const FieldBlocks = ({
  entries,
}: {
  entries: Array<{ key: string; label: string; value: string }>;
}) => (
  <div className={style.draftPreviewList}>
    {entries.map((e) => (
      <div key={e.key} className={style.draftFieldBlock}>
        <p className={style.draftFieldLabel}>{e.label}</p>
        <p className={style.draftFieldValue}>{e.value}</p>
      </div>
    ))}
  </div>
);

const ExpandableText = ({
  label,
  text,
  limit = PREVIEW_LIMIT,
}: {
  label: string;
  text: string;
  limit?: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > limit;
  const shown =
    expanded || !long ? text : text.slice(0, limit) + (long ? "…" : "");
  return (
    <div className={style.draftFieldBlock}>
      <p className={style.draftFieldLabel}>{label}</p>
      <p className={style.draftFieldValue}>{shown}</p>
      {long ? (
        <button
          type="button"
          className={style.prepActionBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "접기" : "본문 더보기"}
        </button>
      ) : null}
    </div>
  );
};

const StudentRowsPreview = ({
  msgId,
  rows,
  targetLabels,
  resolveMeta,
}: {
  msgId: string;
  rows: Array<{
    studentId: string;
    studentName?: string;
    studentGrade?: string;
    values: Record<string, string>;
  }>;
  targetLabels?: string[];
  resolveMeta: (studentId: string) => {
    name?: string;
    grade?: string;
  };
}) => (
  <div className={style.draftPreviewList}>
    {rows.map((row) => {
      const fromCtx = resolveMeta(row.studentId);
      const name = row.studentName || fromCtx.name || row.studentId;
      const grade = row.studentGrade || fromCtx.grade || "";
      const labels =
        targetLabels && targetLabels.length > 0
          ? targetLabels
          : Object.keys(row.values || {});
      return (
        <div
          key={`${msgId}-${row.studentId}`}
          className={style.draftStudentCard}
        >
          <div className={style.draftStudentMeta}>
            <span>
              {grade ? `${grade} ` : ""}
              {name}
            </span>
            <span className={style.draftStudentId}>{row.studentId}</span>
          </div>
          {labels.map((label) => {
            const value = row.values?.[label];
            if (value == null || String(value).trim() === "") return null;
            return (
              <div
                key={`${row.studentId}-${label}`}
                className={style.draftFieldBlock}
              >
                <p className={style.draftFieldLabel}>{label}</p>
                <p className={style.draftFieldValue}>{value}</p>
              </div>
            );
          })}
        </div>
      );
    })}
  </div>
);

const countStudentDraftCells = (
  rows: Array<{ studentId: string; values: Record<string, string> }>,
  targetLabels: string[],
  resolveCurrent: (studentId: string, label: string) => unknown,
  fillEmptyOnly: boolean
) => {
  let fill = 0;
  let skip = 0;
  for (const row of rows) {
    const labels =
      targetLabels.length > 0 ? targetLabels : Object.keys(row.values || {});
    for (const label of labels) {
      const next = row.values?.[label];
      if (next == null || String(next).trim() === "") continue;
      const cur = resolveCurrent(row.studentId, label);
      const empty = isEmptyEval(cur);
      if (fillEmptyOnly && !empty) skip += 1;
      else fill += 1;
    }
  }
  return { fill, skip };
};

const SkillDraftResult = ({
  msgId,
  draft,
  review,
  applied,
  pageContext,
  onApply,
}: Props) => {
  if (draft && isSyllabusDraft(draft)) {
    const filled = (draft.items || []).filter((it) => it.value);
    const current = pageContext?.getCurrentInfo?.() || {};
    let skip = 0;
    let fill = 0;
    for (const item of filled) {
      const cur = current[item.field];
      if (cur != null && String(cur).trim() !== "") skip += 1;
      else fill += 1;
    }
    return (
      <DraftResultCard
        title="수업 초안 미리보기"
        meta={{
          label: `${filled.length}/${(draft.items || []).length}항목`,
          variant: "neutral",
        }}
        summary={
          <>
            {fill > 0 ? `채울 칸 ${fill}` : null}
            {fill > 0 && skip > 0 ? " · " : null}
            {skip > 0 ? `이미 있는 칸 ${skip}` : null}
            {fill === 0 && skip === 0 ? "미리보기 확인 후 반영하세요" : null}
          </>
        }
        actions={
          <ApplyDraftButton
            draft={draft}
            applied={applied}
            visible={!!pageContext?.applyInfoDraft}
            onClick={() => onApply(msgId, draft)}
          />
        }
      >
        <FieldBlocks
          entries={filled.map((item) => ({
            key: `${msgId}-${item.field}`,
            label: item.field,
            value: item.value,
          }))}
        />
      </DraftResultCard>
    );
  }

  if (draft && isEvalDraft(draft)) {
    const fillEmptyOnly = draft.fillEmptyOnly !== false;
    const { fill, skip } = countStudentDraftCells(
      draft.rows || [],
      draft.targetLabels || [],
      (studentId, label) => {
        const row = (pageContext?.getEvaluationRows?.() || []).find(
          (r) => r.studentId === studentId
        );
        return row?.evaluation?.[label];
      },
      fillEmptyOnly
    );
    return (
      <DraftResultCard
        title="평가 초안 미리보기"
        meta={{
          label: `${draft.rows?.length || 0}명`,
          variant: "neutral",
        }}
        summary={
          <>
            항목: {(draft.targetLabels || []).join(", ") || "-"}
            {fillEmptyOnly ? " · 빈 칸만 반영" : " · 덮어쓰기 가능"}
            {fill > 0 || skip > 0
              ? ` · 반영 예정 ${fill}${skip > 0 ? ` · 건너뜀 ${skip}` : ""}`
              : ""}
          </>
        }
        actions={
          <>
            <ApplyDraftButton
              draft={draft}
              applied={applied}
              visible={!!pageContext?.applyEvaluationCsv}
              onClick={() => onApply(msgId, draft)}
            />
            {draft.csv ? (
              <button
                type="button"
                className={style.applyBtn}
                onClick={() => {
                  const blob = new Blob(["\uFEFF" + draft.csv], {
                    type: "text/csv;charset=utf-8",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "evaluation-draft.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                CSV 받기
              </button>
            ) : null}
          </>
        }
      >
        <StudentRowsPreview
          msgId={msgId}
          rows={draft.rows || []}
          targetLabels={draft.targetLabels}
          resolveMeta={(studentId) => {
            const fromCtx = (pageContext?.getEvaluationRows?.() || []).find(
              (r) => r.studentId === studentId
            );
            return {
              name: fromCtx?.studentName,
              grade: fromCtx?.studentGrade,
            };
          }}
        />
      </DraftResultCard>
    );
  }

  if (draft && isArchiveDraft(draft)) {
    const fillEmptyOnly = draft.fillEmptyOnly !== false;
    const { fill, skip } = countStudentDraftCells(
      draft.rows || [],
      draft.targetLabels || [],
      (studentId, label) => {
        const row = (pageContext?.getArchiveRows?.() || []).find(
          (r) => r.studentId === studentId
        );
        return row?.values?.[label];
      },
      fillEmptyOnly
    );
    return (
      <DraftResultCard
        title="기록 초안 미리보기"
        meta={{
          label: `${draft.rows?.length || 0}명`,
          variant: "neutral",
        }}
        summary={
          <>
            항목: {(draft.targetLabels || []).join(", ") || "-"}
            {draft.writeMode === "sameText" ? " · 동일 문구" : " · 학생별"}
            {fillEmptyOnly ? " · 빈 칸만 반영" : " · 덮어쓰기 가능"}
            {fill > 0 || skip > 0
              ? ` · 반영 예정 ${fill}${skip > 0 ? ` · 건너뜀 ${skip}` : ""}`
              : ""}
          </>
        }
        actions={
          <ApplyDraftButton
            draft={draft}
            applied={applied}
            visible={!!pageContext?.applyArchiveDraft}
            onClick={() => onApply(msgId, draft)}
          />
        }
      >
        <StudentRowsPreview
          msgId={`arch-${msgId}`}
          rows={draft.rows || []}
          targetLabels={draft.targetLabels}
          resolveMeta={(studentId) => {
            const fromCtx = (pageContext?.getArchiveRows?.() || []).find(
              (r) => r.studentId === studentId
            );
            return {
              name: fromCtx?.studentName,
              grade: fromCtx?.studentGrade,
            };
          }}
        />
      </DraftResultCard>
    );
  }

  if (draft && isDocumentDraft(draft)) {
    const typeLabel = docTypeLabel(draft.docType);
    return (
      <DraftResultCard
        title="문서 초안 미리보기"
        meta={{
          label: draft.writeMode === "refine" ? "다듬기" : "새 작성",
          variant: "neutral",
        }}
        summary={
          <>
            제목: {draft.title || "-"}
            {typeLabel ? ` · ${typeLabel}` : ""}
            {" · 전체에 덮어쓰기"}
          </>
        }
        actions={
          <ApplyDraftButton
            draft={draft}
            applied={applied}
            visible={!!pageContext?.applyDocumentDraft}
            onClick={() => onApply(msgId, draft)}
          />
        }
      >
        <div className={style.draftPreviewList}>
          <ExpandableText
            label="본문"
            text={draft.content || ""}
            limit={DOC_PREVIEW_LIMIT}
          />
        </div>
      </DraftResultCard>
    );
  }

  if (review && Array.isArray(review.items)) {
    return (
      <div className={style.reviewList}>
        <DraftResultCard
          wrapList={false}
          title="문서 점검 리포트"
          meta={{
            label:
              REVIEW_LEVEL_LABEL[review.overallLevel] ||
              review.overallLevel ||
              "점검",
            variant: reviewLevelToVariant(review.overallLevel),
          }}
          summary={review.summary || undefined}
        />
        {review.items.map((item, idx) => (
          <div
            key={`${item.field || "item"}-${idx}`}
            className={style.reviewItem}
          >
            <div className={style.reviewHeader}>
              <span>{item.field || "항목"}</span>
              <span
                className={`${style.levelChip} ${draftMetaVariantClass(
                  reviewLevelToVariant(item.level)
                )}`}
              >
                {REVIEW_LEVEL_LABEL[item.level] || item.level || ""}
              </span>
            </div>
            {item.comment ? (
              <p className={style.reviewComment}>{item.comment}</p>
            ) : null}
            {item.quote ? (
              <p className={style.reviewQuote}>
                <span className={style.reviewMetaLabel}>원문</span>
                {item.quote}
              </p>
            ) : null}
            {item.exampleBefore || item.exampleAfter ? (
              <div className={style.reviewExampleBox}>
                {item.exampleBefore ? (
                  <p className={style.reviewExampleRow}>
                    <span className={style.reviewMetaLabel}>변경 전</span>
                    {item.exampleBefore}
                  </p>
                ) : null}
                {item.exampleAfter ? (
                  <p className={style.reviewExampleRow}>
                    <span className={style.reviewMetaLabel}>변경 후</span>
                    {item.exampleAfter}
                  </p>
                ) : null}
              </div>
            ) : null}
            {item.suggestion ? (
              <p className={style.suggestion}>제안: {item.suggestion}</p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (draft && isFormResponseDraft(draft)) {
    const snap = pageContext?.getFormResponse?.();
    const labelById = new Map(
      (snap?.fields || []).map((f) => [f.fieldId, f.label || f.fieldId])
    );
    const entries = Object.entries(draft.byField || {});
    let fill = 0;
    let skip = 0;
    for (const [fid, val] of entries) {
      const next =
        typeof val === "string" ? val : val == null ? "" : JSON.stringify(val);
      if (!String(next).trim()) continue;
      const cur = snap?.responses?.[fid];
      const empty =
        cur == null ||
        (typeof cur === "string" && cur.trim() === "") ||
        (Array.isArray(cur) && cur.length === 0);
      if (draft.fillEmptyOnly && !empty) skip += 1;
      else fill += 1;
    }
    return (
      <DraftResultCard
        title="응답 초안 미리보기"
        meta={{
          label: draft.writeMode === "refine" ? "양식 채우기" : "새 작성",
          variant: "neutral",
        }}
        summary={
          <>
            {entries.length}개 필드
            {draft.fillEmptyOnly ? " · 빈 칸만" : ""}
            {fill > 0 || skip > 0
              ? ` · 반영 예정 ${fill}${skip > 0 ? ` · 건너뜀 ${skip}` : ""}`
              : ""}
          </>
        }
        actions={
          <ApplyDraftButton
            draft={draft}
            applied={applied}
            visible={!!pageContext?.applyFormResponseDraft}
            onClick={() => onApply(msgId, draft)}
          />
        }
      >
        <div className={style.draftPreviewList}>
          {entries.slice(0, 12).map(([fid, val]) => {
            const raw =
              typeof val === "string" ? val : JSON.stringify(val, null, 2);
            const text = redactImagesForPreview(raw || "");
            return (
              <ExpandableText
                key={fid}
                label={labelById.get(fid) || fid}
                text={text}
                limit={PREVIEW_LIMIT}
              />
            );
          })}
          {entries.length > 12 ? (
            <p className={style.prepMuted}>외 {entries.length - 12}개 필드</p>
          ) : null}
        </div>
      </DraftResultCard>
    );
  }

  if (draft && isActivityDraft(draft)) {
    const formTypeLabel = activityFormTypeLabel(draft.formType);
    const settings = draft.settings || {};
    const modeBits = [
      settings.quizMode ? "퀴즈" : null,
      settings.assessmentMode ? "평가" : null,
      settings.requiredMode ? "필수 응답" : null,
      settings.allowMultipleResponses ? "복수 응답" : null,
    ].filter(Boolean);
    const fields = draft.fields || [];
    return (
      <DraftResultCard
        title="활동 초안 미리보기"
        meta={{
          label: draft.writeMode === "refine" ? "다듬기" : "새 작성",
          variant: "neutral",
        }}
        summary={
          <>
            제목: {draft.title || "-"}
            {formTypeLabel ? ` · ${formTypeLabel}` : ""}
            {" · 필드 "}
            {fields.length}개
            {(draft.rubrics || []).length > 0
              ? ` · 루브릭 ${(draft.rubrics || []).length}개`
              : ""}
            {modeBits.length > 0 ? ` · ${modeBits.join(", ")}` : ""}
            {" · 전체에 덮어쓰기"}
          </>
        }
        actions={
          <ApplyDraftButton
            draft={draft}
            applied={applied}
            visible={!!pageContext?.applyActivityDraft}
            onClick={() => onApply(msgId, draft)}
          />
        }
      >
        {draft.description ? (
          <p className={style.reviewComment}>{draft.description}</p>
        ) : null}
        {modeBits.length > 0 ? (
          <div className={style.draftModeChips}>
            {modeBits.map((bit) => (
              <span key={String(bit)} className={style.skillTag}>
                {bit}
              </span>
            ))}
          </div>
        ) : null}
        <FieldBlocks
          entries={fields.slice(0, 12).map((f, i) => ({
            key: `${msgId}-f-${i}`,
            label: String(f.label || "(제목 없음)"),
            value: [
              f.type ? `유형: ${f.type}` : null,
              f.required ? "필수" : null,
              Array.isArray(f.options) && f.options.length
                ? `옵션 ${f.options.length}개`
                : null,
              f.gradingMethod ? `채점: ${f.gradingMethod}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
        />
        {fields.length > 12 ? (
          <p className={style.prepMuted}>외 {fields.length - 12}개 필드</p>
        ) : null}
      </DraftResultCard>
    );
  }

  if (draft && isAssessmentGradeDraft(draft)) {
    const fieldEntries = Object.entries(draft.byField || {});
    const gradeFields =
      pageContext?.getAssessmentGradeContext?.()?.fields || [];
    const current = pageContext?.getAssessmentGradeContext?.()?.currentDraft;
    let fill = 0;
    let skip = 0;
    for (const [fid, g] of fieldEntries) {
      const hasDraft =
        g.score != null ||
        !!String(g.comment || "").trim() ||
        Object.keys(g.byRubric || {}).length > 0;
      if (!hasDraft) continue;
      const cur = current?.byField?.[fid];
      const occupied =
        cur?.score != null ||
        !!String(cur?.comment || "").trim() ||
        Object.keys(cur?.byRubric || {}).length > 0;
      if (draft.fillEmptyOnly && occupied) skip += 1;
      else fill += 1;
    }
    const blocks = fieldEntries.slice(0, 12).map(([fid, g]) => {
      const fieldMeta = gradeFields.find((f) => f.fieldId === fid);
      const label = fieldMeta?.label || fid.slice(0, 8);
      const levelBits: string[] = [];
      if (g.score != null) levelBits.push(`점수 ${g.score}`);
      for (const [rid, rg] of Object.entries(g.byRubric || {})) {
        const rubric = fieldMeta?.rubrics?.find((r) => r.id === rid);
        const lv = rubric?.levels?.find((l) => l.id === rg.levelId);
        if (lv?.label) levelBits.push(lv.label);
        else if (rg.levelId) levelBits.push(rg.levelId);
      }
      const comment = String(g.comment || "").trim();
      const value = [
        levelBits.join(", ") || "초안",
        comment ? comment.slice(0, 120) + (comment.length > 120 ? "…" : "") : "",
      ]
        .filter(Boolean)
        .join("\n");
      return { key: fid, label, value };
    });
    return (
      <DraftResultCard
        title="채점 초안 미리보기"
        meta={{
          label: draft.fillEmptyOnly ? "빈 칸만" : "덮어쓰기",
          variant: "neutral",
        }}
        summary={
          <>
            항목 {fieldEntries.length}개
            {fill > 0 || skip > 0
              ? ` · 반영 예정 ${fill}${skip > 0 ? ` · 건너뜀 ${skip}` : ""}`
              : ""}
            {draft.final?.comment
              ? ` · 총평 ${String(draft.final.comment).slice(0, 40)}`
              : ""}
            {fieldEntries.length > 12 ? " · 일부만 표시" : ""}
          </>
        }
        actions={
          <ApplyDraftButton
            draft={draft}
            applied={applied}
            visible={!!pageContext?.applyGradeDraft}
            onClick={() => onApply(msgId, draft)}
          />
        }
      >
        {draft.final?.comment ? (
          <div className={style.draftFieldBlock}>
            <p className={style.draftFieldLabel}>총평</p>
            <p className={style.draftFieldValue}>{draft.final.comment}</p>
          </div>
        ) : null}
        <FieldBlocks entries={blocks} />
      </DraftResultCard>
    );
  }

  return null;
};

export default SkillDraftResult;
