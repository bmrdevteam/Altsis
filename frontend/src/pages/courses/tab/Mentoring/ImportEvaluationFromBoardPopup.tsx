import { useEffect, useMemo, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Select from "components/select/Select";
import { TAltForm, TAltFormField, TAltFormFieldType } from "types/altForm";
import { TFormEvaluation } from "types/seasons";
import { TAltSheetRow } from "types/altSheet";

const IMPORTABLE_FIELD_TYPES = new Set<TAltFormFieldType>([
  "text",
  "textarea",
  "number",
  "date",
  "time",
  "select",
  "radio",
  "rating",
  "scale",
  "counter",
  "link",
]);

type MappingRow = {
  fieldId: string;
  fieldLabel: string;
  fieldType: TAltFormFieldType;
  evaluationLabel: string;
};

type Props = {
  syllabusId: string;
  boardId: string;
  setState: (open: boolean) => void;
  onImported: () => void;
};

const isEmptyEval = (v: unknown) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
};

const ImportEvaluationFromBoardPopup = ({
  syllabusId,
  boardId,
  setState,
  onImported,
}: Props) => {
  const { currentSeason, currentRegistration } = useAuth();
  const { AltFormAPI, AltSheetRowAPI, EnrollmentAPI, SyllabusAPI } = useAPIv2();

  const formEvaluation: TFormEvaluation =
    (currentRegistration?.formEvaluation as TFormEvaluation) ||
    currentSeason?.formEvaluation ||
    [];

  const editableEvalLabels = useMemo(
    () =>
      formEvaluation
        .filter((item) => item.auth?.edit?.teacher)
        .map((item) => item.label),
    [formEvaluation]
  );

  const [forms, setForms] = useState<TAltForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [formId, setFormId] = useState("");
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [preview, setPreview] = useState<{
    willFill: number;
    keepExisting: number;
    noResponse: number;
    noValue: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadingForms(true);
    AltFormAPI.RAltForms({ query: { board: boardId } })
      .then(({ forms: list }) => {
        const usable = (list || []).filter((f) => !f.isDraft);
        setForms(usable);
        if (usable[0]?._id) setFormId(usable[0]._id);
      })
      .catch(ALERT_ERROR)
      .finally(() => setLoadingForms(false));
  }, [boardId]);

  const selectedForm = forms.find((f) => f._id === formId);

  useEffect(() => {
    if (!selectedForm) {
      setMappings([]);
      return;
    }
    const fields = (selectedForm.fields || []).filter((f) =>
      IMPORTABLE_FIELD_TYPES.has(f.type)
    );
    const labelSet = new Set(editableEvalLabels);
    setMappings(
      fields.map((f: TAltFormField) => ({
        fieldId: f._id,
        fieldLabel: f.label,
        fieldType: f.type,
        evaluationLabel: labelSet.has(f.label) ? f.label : "",
      }))
    );
  }, [selectedForm?._id, editableEvalLabels.join("|")]);

  const activeMappings = mappings.filter((m) => m.evaluationLabel);

  useEffect(() => {
    if (!formId || activeMappings.length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const [{ rows }, { enrollments }] = await Promise.all([
          AltSheetRowAPI.RAltSheetRows({ query: { form: formId } }),
          EnrollmentAPI.REnrollmentsWithEvaluation({
            query: { syllabus: syllabusId },
          }),
        ]);
        if (cancelled) return;

        const latestByStudent = new Map<string, TAltSheetRow>();
        const sorted = [...(rows || [])].sort((a, b) => {
          const ta = new Date(a._submittedAt || a.createdAt || 0).getTime();
          const tb = new Date(b._submittedAt || b.createdAt || 0).getTime();
          return tb - ta;
        });
        for (const row of sorted) {
          const sid = row._respondent;
          if (!sid || latestByStudent.has(sid)) continue;
          latestByStudent.set(sid, row);
        }

        let willFill = 0;
        let keepExisting = 0;
        let noResponse = 0;
        let noValue = 0;

        for (const enr of enrollments || []) {
          const row = latestByStudent.get(enr.student);
          if (!row) {
            noResponse += activeMappings.length;
            continue;
          }
          for (const m of activeMappings) {
            const existing = (enr as any).evaluation?.[m.evaluationLabel];
            if (!isEmptyEval(existing)) {
              keepExisting += 1;
              continue;
            }
            const raw = (row.data as any)?.[m.fieldId];
            if (
              raw === null ||
              raw === undefined ||
              (typeof raw === "string" && raw.trim() === "")
            ) {
              noValue += 1;
            } else {
              willFill += 1;
            }
          }
        }
        setPreview({ willFill, keepExisting, noResponse, noValue });
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId, activeMappings.map((m) => `${m.fieldId}:${m.evaluationLabel}`).join(",")]);

  const evalOptions = [
    { text: "(매핑 안 함)", value: "" },
    ...editableEvalLabels.map((label) => ({ text: label, value: label })),
  ];

  const formOptions = forms.map((f) => ({
    text: f.title,
    value: f._id,
  }));

  const handleImport = async () => {
    if (!formId) {
      alert("양식을 선택해주세요.");
      return;
    }
    if (activeMappings.length === 0) {
      alert("평가 항목에 매핑된 필드가 없습니다.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await SyllabusAPI.ImportEvaluationFromBoard({
        params: { _id: syllabusId },
        data: {
          form: formId,
          mappings: activeMappings.map((m) => ({
            fieldId: m.fieldId,
            evaluationLabel: m.evaluationLabel,
          })),
        },
      });
      alert(
        [
          `가져오기 완료`,
          `채움: ${result.filled}`,
          `기존 유지: ${result.skippedExisting}`,
          `응답 없음: ${result.skippedNoResponse}`,
          `값 없음: ${result.skippedNoValue}`,
        ].join("\n")
      );
      setState(false);
      onImported();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popup
      title="활동에서 평가 가져오기"
      setState={setState}
      closeBtn
      style={{ maxWidth: 560, width: "100%" }}
      contentScroll
      contentOverflow="visible"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button type="ghost" onClick={() => setState(false)} disabled={submitting}>
            취소
          </Button>
          <Button
            type="ghost"
            onClick={handleImport}
            disabled={
              submitting ||
              loadingForms ||
              !formId ||
              activeMappings.length === 0
            }
          >
            {submitting ? "가져오는 중..." : "빈 칸만 채우기"}
          </Button>
        </div>
      }
    >
      <div
        style={{
          padding: "4px 0 8px",
          lineHeight: 1.5,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--text-color-2)",
            marginBottom: 16,
          }}
        >
          수업 보드 활동 양식의 제출 값을 평가 표의 <strong>비어 있는 칸</strong>
          에만 넣습니다. 이미 입력된 평가는 바뀌지 않습니다.
        </p>

        {loadingForms ? (
          <div style={{ color: "var(--text-color-2)" }}>양식 불러오는 중…</div>
        ) : forms.length === 0 ? (
          <div style={{ color: "var(--text-color-2)" }}>
            가져올 수 있는 공개 양식이 없습니다.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Select
                label="활동 양식"
                appearence="flat"
                options={formOptions}
                selectedValue={formId}
                onChange={(value: string) => setFormId(value)}
              />
            </div>

            {editableEvalLabels.length === 0 ? (
              <div style={{ color: "var(--text-color-2)", fontSize: 13 }}>
                교사 편집이 가능한 평가 항목이 없습니다.
              </div>
            ) : mappings.length === 0 ? (
              <div style={{ color: "var(--text-color-2)", fontSize: 13 }}>
                이 양식에 가져올 수 있는 필드가 없습니다.
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  marginBottom: 16,
                  /* overflow:hidden 이면 Select 옵션이 잘림 */
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "var(--bg-color-2)",
                    color: "var(--text-color-2)",
                    borderRadius: "8px 8px 0 0",
                  }}
                >
                  <span>양식 필드</span>
                  <span>평가 항목</span>
                </div>
                {mappings.map((m, idx) => (
                  <div
                    key={m.fieldId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      padding: "10px 12px",
                      borderTop: "1px solid var(--border-color)",
                      alignItems: "center",
                      position: "relative",
                      zIndex: mappings.length - idx,
                    }}
                  >
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{m.fieldLabel}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-color-2)",
                          marginTop: 2,
                        }}
                      >
                        {m.fieldType}
                      </div>
                    </div>
                    <Select
                      appearence="flat"
                      options={evalOptions}
                      selectedValue={m.evaluationLabel}
                      onChange={(value: string) => {
                        setMappings((prev) =>
                          prev.map((row) =>
                            row.fieldId === m.fieldId
                              ? { ...row, evaluationLabel: value }
                              : row
                          )
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {activeMappings.length > 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-color-2)",
                  background: "var(--bg-color-2)",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                {previewLoading || !preview ? (
                  "미리보기 계산 중…"
                ) : (
                  <>
                    <div>채울 칸(예상): {preview.willFill}</div>
                    <div>기존 유지(예상): {preview.keepExisting}</div>
                    <div>응답 없음(예상): {preview.noResponse}</div>
                    <div>값 없음(예상): {preview.noValue}</div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Popup>
  );
};

export default ImportEvaluationFromBoardPopup;
