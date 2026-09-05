import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TAlterPageContext } from "contexts/alterContext";
import EditorParser from "editor/EditorParser";
import { isEmptyEval } from "utils/evaluationCsv";
import {
  applyFormDraftToBlocks,
  TFormDraftApplyInput,
} from "utils/formDraftApply";
import { redactImagesForPreview } from "utils/formResponseSlots";
import { NO_PRINT_CLASS, printArea } from "utils/printArea";
import {
  formatActivityAccessGroups,
  normalizeActivityDraftAccess,
} from "utils/activityDraft";
import ApplyDraftButton from "./ApplyDraftButton";
import DraftDataTable from "./DraftDataTable";
import DraftPreviewShell from "./DraftPreviewShell";
import DraftRichBody from "./DraftRichBody";
import { draftMetaVariantClass } from "./DraftResultCard";
import {
  buildCsv,
  buildSearchCsv,
  downloadCsv,
  fieldTypeLabel,
  formParserType,
  formatDraftFieldText,
  looksLikeRichDraftText,
  looksLikeUuid,
  previewFieldLabel,
} from "./draftPreview";
import {
  activityFormTypeLabel,
  adminFormTypeLabel,
  docTypeLabel,
  REVIEW_LEVEL_LABEL,
  reviewLevelToVariant,
  searchCodeToggleLabel,
  searchHasCode,
} from "./draftUi";
import {
  isActivityDraft,
  isArchiveDraft,
  isAssessmentGradeDraft,
  isDocumentDraft,
  isEvalDraft,
  isFormDraft,
  isFormResponseDraft,
  isSearchDraft,
  isSyllabusDraft,
  TAlterDraftResult,
  TAlterDocumentReviewResult,
  TAlterSearchDraftResult,
} from "./types";
import { CANVAS_IFRAME_SANDBOX } from "components/markdown/canvas/canvasModel";
import {
  buildSearchVizSnapshotTailScript,
  createSearchVizSnapshotToken,
  readSearchVizSnapshotMessage,
  serializeSearchVizRows,
  waitForSearchVizSnapshot,
} from "./searchVizSnapshot";
import style from "../Alter.module.scss";

type Props = {
  msgId: string;
  draft?: TAlterDraftResult | null;
  review?: TAlterDocumentReviewResult | null;
  applied: boolean;
  pageContext: TAlterPageContext | null;
  onApply: (msgId: string, draft: TAlterDraftResult) => void;
};

const FieldBlocks = ({
  entries,
}: {
  entries: Array<{ key: string; label: string; value: string }>;
}) => (
  <div className={style.draftPreviewList}>
    {entries.map((e) => (
      <div key={e.key} className={style.draftFieldBlock}>
        <p className={style.draftFieldLabel}>{e.label}</p>
        {looksLikeRichDraftText(e.value) ? (
          <DraftRichBody content={e.value} />
        ) : (
          <p className={style.draftFieldValue}>{e.value}</p>
        )}
      </div>
    ))}
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

const studentTableRows = (
  rows: Array<{
    studentId: string;
    studentName?: string;
    studentGrade?: string;
    values: Record<string, string>;
  }>,
  resolveMeta: (studentId: string) => { name?: string; grade?: string }
) =>
  rows.map((row) => {
    const fromCtx = resolveMeta(row.studentId);
    return {
      _grade: row.studentGrade || fromCtx.grade || "",
      _name: row.studentName || fromCtx.name || row.studentId,
      _id: row.studentId,
      ...(row.values || {}),
    };
  });

const studentTableColumns = (targetLabels?: string[]) => [
  { key: "_grade", label: "학년" },
  { key: "_name", label: "이름" },
  ...(targetLabels || []).map((label) => ({ key: label, label })),
];

const SearchVizFrame = ({
  rows,
  vizCode,
  token,
  onSnapshot,
  onSnapshotFailed,
}: {
  rows: TAlterSearchDraftResult["rows"];
  vizCode: string;
  token: string;
  onSnapshot: (dataUrl: string) => void;
  onSnapshotFailed: () => void;
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [failed, setFailed] = useState(false);
  const safeCode = String(vizCode || "").replace(/<\/script/gi, "<\\/script");
  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<style>html,body{margin:0;padding:8px;font-family:sans-serif;font-size:13px;color:#222;background:transparent}</style>
</head><body><div id="root"></div>
<script>
const rows = ${serializeSearchVizRows(rows)};
try {
${safeCode}
if (typeof render === "function") render(rows);
} catch (e) {
  document.body.textContent = "시각화를 표시하지 못했습니다.";
}
${buildSearchVizSnapshotTailScript(token)}
</script></body></html>`;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const parsed = readSearchVizSnapshotMessage(event.data, token);
      if (!parsed) return;
      if ("failed" in parsed) {
        onSnapshotFailed();
        return;
      }
      onSnapshot(parsed.dataUrl);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [token, onSnapshot, onSnapshotFailed]);

  if (failed) {
    return (
      <p className={style.draftFieldValue}>시각화를 표시하지 못했습니다.</p>
    );
  }
  return (
    <iframe
      ref={iframeRef}
      className={style.searchVizFrame}
      title="검색 시각화"
      sandbox={CANVAS_IFRAME_SANDBOX}
      srcDoc={srcDoc}
      onError={() => setFailed(true)}
    />
  );
};

const SearchResultCard = ({ draft }: { draft: TAlterSearchDraftResult }) => {
  const [snapshotUrl, setSnapshotUrl] = useState("");
  const snapshotUrlRef = useRef("");
  const snapshotFailedRef = useRef(false);
  const snapshotToken = useMemo(
    () => createSearchVizSnapshotToken(),
    [draft.vizCode, draft.rowCount]
  );
  const columns =
    draft.columns?.length > 0
      ? draft.columns
      : Object.keys(draft.rows?.[0] || {}).map((key) => ({ key, label: key }));
  const count = draft.rowCount ?? draft.rows?.length ?? 0;
  const hasCode = searchHasCode(draft);

  useEffect(() => {
    snapshotUrlRef.current = "";
    snapshotFailedRef.current = false;
    setSnapshotUrl("");
  }, [snapshotToken]);

  const handleVizSnapshot = useCallback((dataUrl: string) => {
    snapshotUrlRef.current = dataUrl;
    setSnapshotUrl(dataUrl);
  }, []);

  const handleVizSnapshotFailed = useCallback(() => {
    snapshotFailedRef.current = true;
  }, []);

  return (
    <DraftPreviewShell
      title="검색 결과"
      meta={{
        label: draft.truncated ? `${count}건 · 일부` : `${count}건`,
        variant: "neutral",
      }}
      summary={
        draft.truncated
          ? "표시·저장된 행은 일부입니다. 조건을 좁히면 더 정확히 볼 수 있습니다."
          : null
      }
      sourceOpenLabel={searchCodeToggleLabel(false)}
      sourceCloseLabel={searchCodeToggleLabel(true)}
      source={
        hasCode ? (
          <>
            {draft.sql ? <pre className={style.searchSql}>{draft.sql}</pre> : null}
            {draft.vizCode ? (
              <pre className={style.searchSql}>{draft.vizCode}</pre>
            ) : null}
          </>
        ) : undefined
      }
      actions={
        columns.length > 0 ? (
          <button
            type="button"
            className={style.applyBtn}
            onClick={() => downloadCsv(buildSearchCsv(draft), "alter-search.csv")}
          >
            CSV 받기
          </button>
        ) : null
      }
      onPrint={async (root) => {
        if (draft.vizCode && !snapshotUrlRef.current && !snapshotFailedRef.current) {
          await waitForSearchVizSnapshot(() =>
            Boolean(snapshotUrlRef.current || snapshotFailedRef.current)
          );
        }
        printArea(root);
      }}
      fullscreenAriaLabel="검색 결과 전체 화면"
    >
      {({ fullscreen }) => (
        <>
          {snapshotUrl ? (
            <img
              className={style.searchVizPrintImg}
              src={snapshotUrl}
              alt="검색 시각화"
            />
          ) : null}
          {draft.vizCode ? (
            <div className={snapshotUrl ? NO_PRINT_CLASS : undefined}>
              <SearchVizFrame
                rows={draft.rows || []}
                vizCode={draft.vizCode}
                token={snapshotToken}
                onSnapshot={handleVizSnapshot}
                onSnapshotFailed={handleVizSnapshotFailed}
              />
            </div>
          ) : null}
          <DraftDataTable
            columns={columns}
            rows={(draft.rows || []) as Array<Record<string, unknown>>}
            compact={!fullscreen}
          />
        </>
      )}
    </DraftPreviewShell>
  );
};

const SkillDraftResult = ({
  msgId,
  draft,
  review,
  applied,
  pageContext,
  onApply,
}: Props) => {
  if (draft && isSearchDraft(draft)) {
    return <SearchResultCard draft={draft} />;
  }

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
      <DraftPreviewShell
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
        source={
          <pre>
            {filled.map((it) => `${it.field}\n${it.value}`).join("\n\n")}
          </pre>
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
      </DraftPreviewShell>
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
    const columns = studentTableColumns(draft.targetLabels);
    const tableRows = studentTableRows(draft.rows || [], (studentId) => {
      const fromCtx = (pageContext?.getEvaluationRows?.() || []).find(
        (r) => r.studentId === studentId
      );
      return { name: fromCtx?.studentName, grade: fromCtx?.studentGrade };
    });
    return (
      <DraftPreviewShell
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
                onClick={() => downloadCsv(draft.csv, "evaluation-draft.csv")}
              >
                CSV 받기
              </button>
            ) : null}
          </>
        }
      >
        {({ fullscreen }) => (
          <DraftDataTable
            columns={
              (draft.targetLabels || []).length
                ? columns
                : [
                    ...columns.slice(0, 2),
                    ...Object.keys(draft.rows?.[0]?.values || {}).map((k) => ({
                      key: k,
                      label: k,
                    })),
                  ]
            }
            rows={tableRows}
            compact={!fullscreen}
            rowKey={(row) => String(row._id || "")}
          />
        )}
      </DraftPreviewShell>
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
    const columns = studentTableColumns(draft.targetLabels);
    const tableRows = studentTableRows(draft.rows || [], (studentId) => {
      const fromCtx = (pageContext?.getArchiveRows?.() || []).find(
        (r) => r.studentId === studentId
      );
      return { name: fromCtx?.studentName, grade: fromCtx?.studentGrade };
    });
    return (
      <DraftPreviewShell
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
          <>
            <ApplyDraftButton
              draft={draft}
              applied={applied}
              visible={!!pageContext?.applyArchiveDraft}
              onClick={() => onApply(msgId, draft)}
            />
            <button
              type="button"
              className={style.applyBtn}
              onClick={() =>
                downloadCsv(
                  buildCsv(columns, tableRows),
                  "archive-draft.csv"
                )
              }
            >
              CSV 받기
            </button>
          </>
        }
      >
        {({ fullscreen }) => (
          <DraftDataTable
            columns={
              (draft.targetLabels || []).length
                ? columns
                : [
                    ...columns.slice(0, 2),
                    ...Object.keys(draft.rows?.[0]?.values || {}).map((k) => ({
                      key: k,
                      label: k,
                    })),
                  ]
            }
            rows={tableRows}
            compact={!fullscreen}
            rowKey={(row) => String(row._id || "")}
          />
        )}
      </DraftPreviewShell>
    );
  }

  if (draft && isDocumentDraft(draft)) {
    const typeLabel = docTypeLabel(draft.docType);
    const content = draft.content || "";
    return (
      <DraftPreviewShell
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
        source={<pre>{content}</pre>}
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
          {looksLikeRichDraftText(content) ? (
            <DraftRichBody content={content} />
          ) : (
            <p className={style.draftFieldValue}>{content}</p>
          )}
        </div>
      </DraftPreviewShell>
    );
  }

  if (review && Array.isArray(review.items)) {
    return (
      <DraftPreviewShell
        title="문서 점검 리포트"
        meta={{
          label:
            REVIEW_LEVEL_LABEL[review.overallLevel] ||
            review.overallLevel ||
            "점검",
          variant: reviewLevelToVariant(review.overallLevel),
        }}
        summary={review.summary || undefined}
        source={
          <pre>
            {(review.items || [])
              .map(
                (item) =>
                  `${item.field || "항목"} · ${item.level}\n${item.comment || ""}\n${item.quote || ""}`
              )
              .join("\n\n")}
          </pre>
        }
      >
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
              <div className={style.reviewQuote}>
                <span className={style.reviewMetaLabel}>원문</span>
                {looksLikeRichDraftText(item.quote) ? (
                  <DraftRichBody content={item.quote} />
                ) : (
                  item.quote
                )}
              </div>
            ) : null}
            {item.exampleBefore || item.exampleAfter ? (
              <div className={style.reviewExampleBox}>
                {item.exampleBefore ? (
                  <div className={style.reviewExampleRow}>
                    <span className={style.reviewMetaLabel}>변경 전</span>
                    {looksLikeRichDraftText(item.exampleBefore) ? (
                      <DraftRichBody content={item.exampleBefore} />
                    ) : (
                      item.exampleBefore
                    )}
                  </div>
                ) : null}
                {item.exampleAfter ? (
                  <div className={style.reviewExampleRow}>
                    <span className={style.reviewMetaLabel}>변경 후</span>
                    {looksLikeRichDraftText(item.exampleAfter) ? (
                      <DraftRichBody content={item.exampleAfter} />
                    ) : (
                      item.exampleAfter
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            {item.suggestion ? (
              <p className={style.suggestion}>제안: {item.suggestion}</p>
            ) : null}
          </div>
        ))}
      </DraftPreviewShell>
    );
  }

  if (draft && isFormResponseDraft(draft)) {
    const snap = pageContext?.getFormResponse?.();
    const fieldById = new Map((snap?.fields || []).map((f) => [f.fieldId, f]));
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
    const sourceText = entries
      .map(([fid, val]) => {
        const field = fieldById.get(fid);
        const raw = formatDraftFieldText(val, field);
        const label = previewFieldLabel(fid, raw, field);
        return `${label}\n${redactImagesForPreview(raw)}`;
      })
      .join("\n\n");
    return (
      <DraftPreviewShell
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
        source={<pre>{sourceText}</pre>}
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
          {entries.map(([fid, val]) => {
            const field = fieldById.get(fid);
            const raw = formatDraftFieldText(val, field);
            const text = redactImagesForPreview(raw || "");
            const label = previewFieldLabel(fid, raw, field);
            const rich =
              field?.type === "docResponse" || looksLikeRichDraftText(text);
            return (
              <div key={fid} className={style.draftFieldBlock}>
                <p className={style.draftFieldLabel}>{label}</p>
                {rich ? (
                  <DraftRichBody content={text} />
                ) : (
                  <p className={style.draftFieldValue}>{text}</p>
                )}
              </div>
            );
          })}
        </div>
      </DraftPreviewShell>
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
      settings.allowResubmit ? "응답 수정" : null,
    ].filter(Boolean);
    const access = normalizeActivityDraftAccess(draft.access);
    const memberAccess = formatActivityAccessGroups(access?.members);
    const writerAccess = formatActivityAccessGroups(access?.writers);
    const fields = draft.fields || [];
    return (
      <DraftPreviewShell
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
        source={
          <pre>
            {fields
              .map(
                (f) =>
                  `${f.label || "(제목 없음)"} · ${f.type || ""}\n${
                    Array.isArray(f.options) ? f.options.join(", ") : ""
                  }\n${f.content || ""}`
              )
              .join("\n\n")}
          </pre>
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
          looksLikeRichDraftText(draft.description) ? (
            <DraftRichBody content={draft.description} />
          ) : (
            <p className={style.reviewComment}>{draft.description}</p>
          )
        ) : null}
        {modeBits.length > 0 || memberAccess || writerAccess ? (
          <div className={style.draftModeChips}>
            {modeBits.map((bit) => (
              <span key={String(bit)} className={style.skillTag}>
                {bit}
              </span>
            ))}
            {memberAccess ? (
              <span className={style.skillTag}>멤버: {memberAccess}</span>
            ) : null}
            {writerAccess ? (
              <span className={style.skillTag}>작성: {writerAccess}</span>
            ) : null}
          </div>
        ) : null}
        <div className={style.draftPreviewList}>
          {fields.map((f, i) => (
            <div key={`${msgId}-f-${i}`} className={style.draftFieldBlock}>
              <p className={style.draftFieldLabel}>
                {String(f.label || "(제목 없음)")}
              </p>
              <p className={style.draftFieldValue}>
                {[
                  fieldTypeLabel(f.type) || f.type,
                  f.required ? "필수" : null,
                  f.gradingMethod ? `채점: ${f.gradingMethod}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {Array.isArray(f.options) && f.options.length ? (
                <div className={style.draftOptionList}>
                  {f.options.map((opt) => (
                    <span key={String(opt)} className={style.skillTag}>
                      {opt}
                    </span>
                  ))}
                </div>
              ) : null}
              {f.content ? <DraftRichBody content={String(f.content)} /> : null}
            </div>
          ))}
        </div>
        {(draft.rubrics || []).length > 0 ? (
          <div className={style.draftPreviewList}>
            {(draft.rubrics || []).map((r, i) => (
              <div key={`${msgId}-r-${i}`} className={style.draftFieldBlock}>
                <p className={style.draftFieldLabel}>
                  {r.title || `루브릭 ${i + 1}`}
                </p>
                <div className={style.draftOptionList}>
                  {(r.levels || []).map((lv, li) => (
                    <span key={`${i}-${li}`} className={style.skillTag}>
                      {lv.label || "수준"}
                      {lv.points != null ? ` ${lv.points}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </DraftPreviewShell>
    );
  }

  if (draft && isFormDraft(draft)) {
    const typeLabel = adminFormTypeLabel(draft.formType);
    const isRefine = draft.writeMode === "refine";
    const current = pageContext?.getForm?.();
    const preview = applyFormDraftToBlocks(
      {
        title: current?.title || draft.title || "",
        blocks: current?.blocks || [],
      },
      {
        writeMode: draft.writeMode,
        title: draft.title,
        formType: draft.formType,
        blocks: draft.blocks,
        ops: draft.ops,
      } as TFormDraftApplyInput
    );
    const blocks = preview.blocks || [];
    return (
      <DraftPreviewShell
        title="양식 초안 미리보기"
        meta={{
          label: isRefine ? "부분 수정" : "새 작성",
          variant: "neutral",
        }}
        summary={
          <>
            제목: {draft.title || preview.title || "-"}
            {typeLabel ? ` · ${typeLabel}` : ""}
            {isRefine
              ? ` · ${(draft.ops || []).length}곳`
              : ` · 블록 ${blocks.length}개`}
          </>
        }
        source={
          <pre>
            {isRefine
              ? (draft.ops || [])
                  .map((op, i) => `${i + 1}. ${String(op.op || "수정")}`)
                  .join("\n")
              : (draft.blocks || [])
                  .map((b, i) => `${i + 1}. ${String(b.type || "block")}`)
                  .join("\n")}
          </pre>
        }
        actions={
          <ApplyDraftButton
            draft={draft}
            applied={applied}
            visible={!!pageContext?.applyFormDraft}
            onClick={() => onApply(msgId, draft)}
          />
        }
      >
        {blocks.length ? (
          <div className={style.draftFormPreview}>
            <EditorParser
              auth="view"
              type={formParserType(draft.formType || current?.formType)}
              data={{ data: blocks }}
            />
          </div>
        ) : (
          <p className={style.draftFieldValue}>미리볼 블록이 없습니다.</p>
        )}
      </DraftPreviewShell>
    );
  }

  if (draft && isAssessmentGradeDraft(draft)) {
    const gradeFields =
      pageContext?.getAssessmentGradeContext?.()?.fields || [];
    const batchRows =
      Array.isArray(draft.rows) && draft.rows.length > 1 ? draft.rows : null;
    const single = batchRows
      ? null
      : {
          byField:
            draft.rows?.[0]?.byField || draft.byField || {},
          final: draft.rows?.[0]?.final || draft.final,
        };
    const fieldEntries = Object.entries(single?.byField || {});
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
    return (
      <DraftPreviewShell
        title="채점 초안 미리보기"
        meta={{
          label: draft.fillEmptyOnly ? "빈 칸만" : "덮어쓰기",
          variant: "neutral",
        }}
        summary={
          batchRows ? (
            <>
              {batchRows.length}명
            </>
          ) : (
            <>
              항목 {fieldEntries.length}개
              {fill > 0 || skip > 0
                ? ` · 반영 예정 ${fill}${skip > 0 ? ` · 건너뜀 ${skip}` : ""}`
                : ""}
            </>
          )
        }
        source={
          <pre>
            {batchRows
              ? batchRows
                  .map((row) => {
                    const name = [
                      row.respondentName,
                      row.respondentId ? `(${row.respondentId})` : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return `${name || row.rowId}\n${row.final?.comment || ""}`;
                  })
                  .join("\n\n")
              : `${
                  single?.final?.comment
                    ? `총평\n${single.final.comment}\n\n`
                    : ""
                }${fieldEntries
                  .map(([fid, g]) => `${fid}\n${g.comment || ""}`)
                  .join("\n\n")}`}
          </pre>
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
        {batchRows ? (
          <div className={style.draftPreviewList}>
            {batchRows.map((row) => {
              const name = [
                row.respondentName,
                row.respondentId ? `(${row.respondentId})` : "",
              ]
                .filter(Boolean)
                .join(" ");
              const comment = String(row.final?.comment || "").trim();
              const scores = Object.values(row.byField || {}).filter(
                (g) => g.score != null
              );
              return (
                <div key={row.rowId} className={style.draftFieldBlock}>
                  <p className={style.draftFieldLabel}>{name || "응답"}</p>
                  <div className={style.draftOptionList}>
                    {scores.map((g, idx) => (
                      <span key={`${row.rowId}-${idx}`} className={style.skillTag}>
                        점수 {g.score}
                      </span>
                    ))}
                  </div>
                  {comment ? (
                    looksLikeRichDraftText(comment) ? (
                      <DraftRichBody content={comment} />
                    ) : (
                      <p className={style.draftFieldValue}>{comment}</p>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {single?.final?.comment ? (
              <div className={style.draftFieldBlock}>
                <p className={style.draftFieldLabel}>총평</p>
                {looksLikeRichDraftText(single.final.comment) ? (
                  <DraftRichBody content={single.final.comment} />
                ) : (
                  <p className={style.draftFieldValue}>{single.final.comment}</p>
                )}
              </div>
            ) : null}
            <div className={style.draftPreviewList}>
              {fieldEntries.map(([fid, g], idx) => {
                const fieldMeta = gradeFields.find((f) => f.fieldId === fid);
                const rawLabel = fieldMeta?.label || "";
                const label =
                  rawLabel && !looksLikeUuid(rawLabel)
                    ? rawLabel
                    : rawLabel || `문항 ${idx + 1}`;
                const comment = String(g.comment || "").trim();
                return (
                  <div key={fid} className={style.draftFieldBlock}>
                    <p className={style.draftFieldLabel}>{label}</p>
                    <div className={style.draftOptionList}>
                      {g.score != null ? (
                        <span className={style.skillTag}>점수 {g.score}</span>
                      ) : null}
                      {Object.entries(g.byRubric || {}).map(([rid, rg]) => {
                        const rubric = fieldMeta?.rubrics?.find(
                          (r) => r.id === rid
                        );
                        const lv = rubric?.levels?.find(
                          (l) => l.id === rg.levelId
                        );
                        return (
                          <span key={rid} className={style.skillTag}>
                            {lv?.label || rg.levelId || "수준"}
                          </span>
                        );
                      })}
                    </div>
                    {comment ? (
                      looksLikeRichDraftText(comment) ? (
                        <DraftRichBody content={comment} />
                      ) : (
                        <p className={style.draftFieldValue}>{comment}</p>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DraftPreviewShell>
    );
  }

  return null;
};

export { buildSearchCsv };
export default SkillDraftResult;
