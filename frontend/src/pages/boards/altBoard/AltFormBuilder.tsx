import { useCallback, useEffect, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import {
  TAltForm,
  TAltFormField,
  TAltFormFieldType,
  TDisplayCondition,
  TDisplayConditionOperator,
  TDuplicateCheck,
  TQuizSettings,
} from "types/altForm";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Svg from "assets/svg/Svg";
import { MarkdownEditor } from "components/markdown";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import AltSubmissionTracker from "./AltSubmissionTracker";

const toLocalDatetimeString = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

type Props = {
  board: TBoard;
  formId?: string;
  onBack: () => void;
  onRespondForm?: (formId: string) => void;
  onCopyFormLink?: (formId: string) => void;
  /** 새 양식 첫 저장 후 ID 반영 (URL·상태 유지) */
  onFormCreated?: (formId: string) => void;
};

const FIELD_TYPE_LABELS: Record<TAltFormFieldType, string> = {
  text: "단답형",
  textarea: "장문형",
  number: "숫자",
  date: "날짜",
  multiDate: "복수 날짜",
  time: "시간",
  file: "파일",
  select: "드롭다운",
  multiSelect: "다중 선택",
  checkbox: "체크박스",
  radio: "라디오",
  userSelect: "사용자 선택",
  rating: "별점",
  scale: "척도",
  counter: "카운터",
  approval: "승인",
  link: "링크",
  content: "문서",
  docResponse: "문서 응답",
};

const FIELD_TYPE_GROUPS: { label: string; types: TAltFormFieldType[] }[] = [
  { label: "텍스트", types: ["text", "textarea", "number"] },
  { label: "선택", types: ["radio", "checkbox", "select", "multiSelect"] },
  { label: "날짜/시간", types: ["date", "multiDate", "time"] },
  {
    label: "특수",
    types: [
      "content",
      "docResponse",
      "rating",
      "scale",
      "counter",
      "file",
      "userSelect",
      "approval",
      "link",
    ],
  },
];

const CONDITION_OPERATOR_LABELS: Record<TDisplayConditionOperator, string> = {
  equals: "같음",
  notEquals: "다름",
  contains: "포함",
  before: "이전",
  after: "이후",
  isEmpty: "비어있음",
  isNotEmpty: "비어있지 않음",
};

const SYSTEM_VARIABLES = [
  { id: "_system_date", label: "현재 날짜" },
  { id: "_system_time", label: "현재 시간" },
  { id: "_system_day", label: "현재 요일" },
] as const;

const createEmptyField = (
  type: TAltFormFieldType = "text"
): TAltFormField => ({
  _id: crypto.randomUUID(),
  label: "",
  type,
  permission: "respondent",
  visibleToRespondent: false,
  required: false,
  options: ["select", "multiSelect", "radio"].includes(type)
    ? ["옵션 1", "옵션 2"]
    : [],
  content:
    type === "content" || type === "docResponse" ? "" : undefined,
  approvalLine:
    type === "approval"
      ? { steps: [{ order: 0, label: "1차 승인", mode: "pick" }] }
      : undefined,
  order: 0,
});

type Settings = {
  allowResubmit: boolean;
  allowMultipleResponses: boolean;
  openAt: string;
  closeAt: string;
  quizMode: boolean;
  quizSettings: TQuizSettings;
  directInputMode: boolean;
  shareResponses: boolean;
  showOwnerFields: boolean;
  showOwnResponse: boolean;
};

const AltFormBuilder = ({
  board,
  formId,
  onBack,
  onRespondForm,
  onCopyFormLink,
  onFormCreated,
}: Props) => {
  const { AltFormAPI, PostAPI } = useAPIv2();

  const handleEditorImageUpload = async (
    file: File
  ): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await PostAPI.CUploadPostFile({ data: formData });
      return `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(result.key)}`;
    } catch (err) {
      ALERT_ERROR(err);
      return null;
    }
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<TAltFormField[]>([]);
  const [settings, setSettings] = useState<Settings>({
    allowResubmit: false,
    allowMultipleResponses: false,
    openAt: "",
    closeAt: "",
    quizMode: false,
    quizSettings: {
      scoreReveal: "immediately",
      answerReveal: "afterDeadline",
      showWrongMarks: true,
    },
    directInputMode: false,
    shareResponses: false,
    showOwnerFields: false,
    showOwnResponse: true,
  });
  const [isLoading, setIsLoading] = useState(!!formId);
  const [isSaving, setIsSaving] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [currentFormId, setCurrentFormId] = useState(formId);
  const [isDirty, setIsDirty] = useState(false);
  /** 비공개(true) / 공개(false). 신규는 비공개 */
  const [isDraft, setIsDraft] = useState(!formId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const savedSnapshotRef = useRef<string | null>(null);

  // Google Forms style: active field (expanded) + builder tab
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [builderTab, setBuilderTab] = useState<"form" | "settings">("form");
  const builderBodyRef = useRef<HTMLDivElement>(null);

  const getSnapshot = useCallback(
    (
      next?: Partial<{
        title: string;
        description: string;
        fields: TAltFormField[];
        settings: Settings;
      }>
    ) =>
      JSON.stringify({
        title: (next?.title ?? title).trim(),
        description: (next?.description ?? description).trim(),
        fields: next?.fields ?? fields,
        settings: next?.settings ?? settings,
      }),
    [title, description, fields, settings]
  );

  // Click outside field card / add toolbar → deactivate
  // Popup(이미지·YouTube·HTML 등)은 fixed 오버레이라 필드 카드 밖처럼 보이므로 제외
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-field-card]") &&
        !target.closest("[data-field-toolbar]") &&
        !target.closest("[data-editor-popup]")
      ) {
        setActiveFieldId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // 첫 임시 저장 후 부모가 formId를 넘길 때: 이미 편집 중이면 재조회 생략
    if (formId && formId === currentFormId) {
      return;
    }
    setCurrentFormId(formId);
    if (!formId) setIsDraft(true);
  }, [formId]);

  useEffect(() => {
    if (!formId) {
      // 새 양식: 초기 빈 상태를 기준 스냅샷으로
      if (savedSnapshotRef.current === null) {
        savedSnapshotRef.current = getSnapshot();
        setIsDirty(false);
      }
      return;
    }
    // 방금 생성해 currentFormId가 이미 같으면 스킵 (깜빡임·메뉴 전환 방지)
    if (formId === currentFormId && savedSnapshotRef.current !== null) {
      return;
    }
    setIsLoading(true);
    AltFormAPI.RAltForm({ params: { _id: formId } })
      .then(({ form }) => {
        const nextSettings: Settings = {
          allowResubmit: form.settings.allowResubmit,
          allowMultipleResponses: form.settings.allowMultipleResponses || false,
          openAt: form.settings.openAt
            ? toLocalDatetimeString(new Date(form.settings.openAt))
            : "",
          closeAt: form.settings.closeAt
            ? toLocalDatetimeString(new Date(form.settings.closeAt))
            : "",
          quizMode: form.settings.quizMode || false,
          quizSettings: form.settings.quizSettings || {
            scoreReveal: "immediately",
            answerReveal: "afterDeadline",
            showWrongMarks: true,
          },
          directInputMode: form.settings.directInputMode || false,
          shareResponses: form.settings.shareResponses || false,
          showOwnerFields: form.settings.showOwnerFields || false,
          showOwnResponse: form.settings.showOwnResponse !== false,
        };
        setTitle(form.title);
        setDescription(form.description);
        setFields(form.fields);
        setSettings(nextSettings);
        setIsDraft(!!form.isDraft);
        setCurrentFormId(form._id);
        savedSnapshotRef.current = JSON.stringify({
          title: form.title.trim(),
          description: (form.description || "").trim(),
          fields: form.fields,
          settings: nextSettings,
        });
        setIsDirty(false);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        onBack();
      });
  }, [formId]);

  // 변경 감지
  useEffect(() => {
    if (isLoading || savedSnapshotRef.current === null) return;
    setIsDirty(getSnapshot() !== savedSnapshotRef.current);
  }, [getSnapshot, isLoading]);

  /**
   * @param visibility keep=현재 상태 유지, private=비공개, public=공개
   */
  const handleSave = async (visibility: "keep" | "private" | "public") => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const asDraft =
        visibility === "keep" ? isDraft : visibility === "private";
      const data = {
        title: title.trim(),
        description: description.trim(),
        fields: fields.map((f, i) => ({ ...f, order: i })),
        settings: {
          allowResubmit: settings.allowResubmit,
          allowMultipleResponses: settings.allowMultipleResponses,
          openAt: settings.openAt ? new Date(settings.openAt).toISOString() : undefined,
          closeAt: settings.closeAt ? new Date(settings.closeAt).toISOString() : undefined,
          quizMode: settings.quizMode,
          quizSettings: settings.quizMode ? settings.quizSettings : undefined,
          directInputMode: settings.directInputMode,
          shareResponses: settings.shareResponses,
          showOwnerFields: settings.showOwnerFields,
          showOwnResponse: settings.showOwnResponse,
        },
        isDraft: asDraft,
      };

      if (currentFormId) {
        await AltFormAPI.UAltForm({ params: { _id: currentFormId }, data });
      } else {
        const { form } = await AltFormAPI.CAltForm({
          data: { ...data, board: board._id },
        });
        setCurrentFormId(form._id);
        onFormCreated?.(form._id);
      }

      setIsDraft(asDraft);
      savedSnapshotRef.current = getSnapshot({
        title: data.title,
        description: data.description,
        fields: data.fields,
        settings,
      });
      setIsDirty(false);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = () => {
    if (!currentFormId || !isDraft) {
      alert("공개 중인 양식은 비공개로 전환한 뒤 삭제할 수 있습니다.");
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentFormId || !isDraft) return;
    setIsDeleting(true);
    try {
      await AltFormAPI.DAltForm({ params: { _id: currentFormId } });
      setShowDeleteConfirm(false);
      onBack();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Field operations ───

  const addField = () => {
    const newField = createEmptyField();
    if (settings.directInputMode) {
      newField.permission = "owner";
    }
    setFields([...fields, newField]);
    setActiveFieldId(newField._id);
  };

  const addFieldAtIndex = (
    index: number,
    type: TAltFormFieldType = "text"
  ) => {
    const newField = createEmptyField(type);
    if (settings.directInputMode) {
      newField.permission = "owner";
    }
    const next = [...fields];
    next.splice(index, 0, newField);
    setFields(next);
    setActiveFieldId(newField._id);
  };

  const duplicateField = (index: number) => {
    const original = fields[index];
    const copy: TAltFormField = {
      ...JSON.parse(JSON.stringify(original)),
      _id: crypto.randomUUID(),
    };
    const next = [...fields];
    next.splice(index + 1, 0, copy);
    setFields(next);
    setActiveFieldId(copy._id);
  };

  const updateField = (index: number, partial: Partial<TAltFormField>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...partial } : f))
    );
  };

  const removeField = (index: number) => {
    const label = fields[index]?.label?.trim() || "이 필드";
    if (
      !window.confirm(
        `「${label}」을(를) 삭제하면 기존 응답에서 해당 답이 양식에 표시되지 않을 수 있습니다. 삭제할까요?`
      )
    ) {
      return;
    }
    const removedId = fields[index]._id;
    setFields((prev) => prev.filter((_, i) => i !== index));
    if (activeFieldId === removedId) setActiveFieldId(null);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const next = [...fields];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setFields(next);
  };

  const addOption = (fieldIndex: number) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === fieldIndex
          ? {
              ...f,
              options: [
                ...(f.options || []),
                `옵션 ${(f.options?.length || 0) + 1}`,
              ],
            }
          : f
      )
    );
  };

  const updateOption = (
    fieldIndex: number,
    optionIndex: number,
    value: string
  ) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === fieldIndex
          ? {
              ...f,
              options: f.options?.map((o, j) =>
                j === optionIndex ? value : o
              ),
            }
          : f
      )
    );
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    setFields((prev) =>
      prev.map((f, i) =>
        i === fieldIndex
          ? { ...f, options: f.options?.filter((_, j) => j !== optionIndex) }
          : f
      )
    );
  };

  const needsOptions = (type: TAltFormFieldType) =>
    ["select", "multiSelect", "radio"].includes(type);

  const isGradable = (type: TAltFormFieldType) =>
    ["select", "radio", "checkbox", "number", "multiSelect"].includes(type);

  // ─── Display condition helpers ───

  const updateDisplayCondition = (
    fieldIndex: number,
    condition: TDisplayCondition
  ) => {
    updateField(fieldIndex, { displayCondition: condition });
  };

  const addCondition = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const dc: TDisplayCondition = field.displayCondition || {
      enabled: true,
      logic: "and",
      conditions: [],
    };
    dc.enabled = true;
    dc.conditions = [
      ...dc.conditions,
      { fieldId: "", operator: "equals", value: "" },
    ];
    updateDisplayCondition(fieldIndex, { ...dc });
  };

  const updateDuplicateCheck = (
    fieldIndex: number,
    dc: TDuplicateCheck
  ) => {
    updateField(fieldIndex, { duplicateCheck: dc });
  };

  if (isLoading) return null;

  // ─── Render helpers ───

  const MI = ({ icon, size = 20 }: { icon: string; size?: number }) => (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {icon}
    </span>
  );

  const renderOptionIcon = (type: TAltFormFieldType) => {
    if (type === "radio")
      return (
        <span className={style.optionIcon}>
          <MI icon="radio_button_unchecked" />
        </span>
      );
    if (type === "checkbox")
      return (
        <span className={style.optionIcon}>
          <MI icon="check_box_outline_blank" />
        </span>
      );
    return (
      <span className={style.optionIcon}>
        <MI icon="arrow_drop_down_circle" />
      </span>
    );
  };

  const renderConditionValueInput = (
    cond: { fieldId: string; operator: string; value: any },
    onChange: (value: any) => void
  ) => {
    if (["isEmpty", "isNotEmpty"].includes(cond.operator)) return null;
    const inputStyle = { fontSize: "12px", padding: "3px 6px", flex: 1 };

    if (cond.fieldId === "_system_date") {
      return (
        <input
          className={style.fieldInput}
          type="date"
          style={inputStyle}
          value={cond.value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    if (cond.fieldId === "_system_time") {
      return (
        <input
          className={style.fieldInput}
          type="time"
          style={inputStyle}
          value={cond.value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    if (cond.fieldId === "_system_day") {
      return (
        <select
          className={style.selectInput}
          style={{ ...inputStyle, width: "60px", flex: "0 0 auto" }}
          value={cond.value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">선택</option>
          {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className={style.fieldInput}
        style={inputStyle}
        value={cond.value ?? ""}
        placeholder="값"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };

  const renderConditionEditor = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const dc = field.displayCondition;
    if (!dc?.enabled) return null;

    const prevFields = fields
      .slice(0, fieldIndex)
      .filter((f) => f.type !== "content");

    return (
      <div
        style={{
          marginTop: "8px",
          padding: "8px",
          background: "var(--background-color-2)",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
            로직:
          </span>
          <select
            className={style.selectInput}
            style={{ fontSize: "12px", padding: "3px 6px", width: "70px" }}
            value={dc.logic}
            onChange={(e) =>
              updateDisplayCondition(fieldIndex, {
                ...dc,
                logic: e.target.value as "and" | "or",
              })
            }
          >
            <option value="and">AND</option>
            <option value="or">OR</option>
          </select>
        </div>
        {dc.conditions.map((cond, ci) => (
          <div
            key={ci}
            style={{
              display: "flex",
              gap: "4px",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <select
              className={style.selectInput}
              style={{ fontSize: "12px", padding: "3px 6px", flex: 1 }}
              value={cond.fieldId}
              onChange={(e) => {
                const newConds = [...dc.conditions];
                newConds[ci] = { ...cond, fieldId: e.target.value, value: "" };
                updateDisplayCondition(fieldIndex, {
                  ...dc,
                  conditions: newConds,
                });
              }}
            >
              <option value="">필드 선택</option>
              <optgroup label="시스템 변수">
                {SYSTEM_VARIABLES.map((sv) => (
                  <option key={sv.id} value={sv.id}>
                    {sv.label}
                  </option>
                ))}
              </optgroup>
              {prevFields.length > 0 && (
                <optgroup label="양식 필드">
                  {prevFields.map((pf) => (
                    <option key={pf._id} value={pf._id}>
                      {pf.label || "(이름 없음)"}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <select
              className={style.selectInput}
              style={{ fontSize: "12px", padding: "3px 6px", width: "80px" }}
              value={cond.operator}
              onChange={(e) => {
                const newConds = [...dc.conditions];
                newConds[ci] = {
                  ...cond,
                  operator: e.target.value as TDisplayConditionOperator,
                };
                updateDisplayCondition(fieldIndex, {
                  ...dc,
                  conditions: newConds,
                });
              }}
            >
              {Object.entries(CONDITION_OPERATOR_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {renderConditionValueInput(cond, (value) => {
              const newConds = [...dc.conditions];
              newConds[ci] = { ...cond, value };
              updateDisplayCondition(fieldIndex, {
                ...dc,
                conditions: newConds,
              });
            })}
            <button
              className={style.removeBtn}
              onClick={() => {
                const newConds = dc.conditions.filter((_, j) => j !== ci);
                if (newConds.length === 0) {
                  updateDisplayCondition(fieldIndex, {
                    ...dc,
                    enabled: false,
                    conditions: [],
                  });
                } else {
                  updateDisplayCondition(fieldIndex, {
                    ...dc,
                    conditions: newConds,
                  });
                }
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className={style.addFieldBtn}
          style={{ padding: "4px 8px", fontSize: "12px" }}
          onClick={() => addCondition(fieldIndex)}
        >
          + 조건 추가
        </button>
      </div>
    );
  };

  const renderQuizSettings = (fieldIndex: number) => {
    if (!settings.quizMode) return null;
    const field = fields[fieldIndex];
    if (field.type === "content") return null;
    if (field.permission !== "respondent") return null;

    const gradable = isGradable(field.type);

    return (
      <div
        style={{
          marginTop: "8px",
          padding: "8px",
          background: "var(--background-color-2)",
          borderRadius: "6px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 600 }}>퀴즈 설정</span>
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "4px",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
            배점:
          </span>
          <input
            className={style.fieldInput}
            type="number"
            min={0}
            style={{ width: "60px", fontSize: "12px", padding: "3px 6px" }}
            value={field.points || 0}
            onChange={(e) =>
              updateField(fieldIndex, { points: Number(e.target.value) })
            }
          />
          <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
            점
          </span>
        </div>
        {gradable ? (
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "4px",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
              정답:
            </span>
            {field.type === "select" || field.type === "radio" ? (
              <select
                className={style.selectInput}
                style={{ fontSize: "12px", padding: "3px 6px", flex: 1 }}
                value={field.correctAnswer ?? ""}
                onChange={(e) =>
                  updateField(fieldIndex, { correctAnswer: e.target.value })
                }
              >
                <option value="">선택</option>
                {field.options?.map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "number" ? (
              <input
                className={style.fieldInput}
                type="number"
                style={{
                  width: "100px",
                  fontSize: "12px",
                  padding: "3px 6px",
                }}
                value={field.correctAnswer ?? ""}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    correctAnswer: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            ) : (
              <span
                style={{ fontSize: "11px", color: "var(--text-color-2)" }}
              >
                (체크박스/다중선택 — 옵션으로 정답 지정)
              </span>
            )}
          </div>
        ) : (
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-color-2)",
              marginTop: "4px",
            }}
          >
            수동 채점 (자동 채점 불가)
          </div>
        )}
      </div>
    );
  };

  const renderFieldTypeSettings = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    switch (field.type) {
      case "content":
        return (
          <div style={{ marginTop: "8px" }}>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginBottom: "8px",
              }}
            >
              응답 화면에 표시되는 안내·설명 문서입니다. (메일머지 없음)
            </div>
            <MarkdownEditor
              value={field.content ?? ""}
              onChange={(md) => updateField(fieldIndex, { content: md })}
              placeholder="마크다운으로 안내문을 작성하세요."
              minHeight="220px"
              onImageUpload={handleEditorImageUpload}
            />
          </div>
        );
      case "docResponse":
        return (
          <div style={{ marginTop: "8px" }}>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginBottom: "8px",
              }}
            >
              응답자에게 미리 채워지는 템플릿입니다. 필수 항목일 때만 템플릿을
              수정한 뒤에 제출할 수 있으며, 편집한 마크다운이 응답값으로
              저장됩니다.
            </div>
            <MarkdownEditor
              value={field.content ?? ""}
              onChange={(md) => updateField(fieldIndex, { content: md })}
              placeholder="응답 템플릿을 마크다운으로 작성하세요."
              minHeight="220px"
              onImageUpload={handleEditorImageUpload}
            />
          </div>
        );
      case "rating":
        return (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginTop: "4px",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
              최대 별:
            </span>
            <input
              className={style.fieldInput}
              type="number"
              min={1}
              max={10}
              style={{ width: "60px", fontSize: "12px", padding: "3px 6px" }}
              value={field.validation?.maxStars || 5}
              onChange={(e) =>
                updateField(fieldIndex, {
                  validation: {
                    ...field.validation,
                    maxStars: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        );
      case "scale":
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              marginTop: "4px",
            }}
          >
            <div
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <span
                style={{ fontSize: "12px", color: "var(--text-color-2)" }}
              >
                최소:
              </span>
              <input
                className={style.fieldInput}
                type="number"
                style={{ width: "50px", fontSize: "12px", padding: "3px 6px" }}
                value={field.validation?.min ?? 1}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      min: Number(e.target.value),
                    },
                  })
                }
              />
              <span
                style={{ fontSize: "12px", color: "var(--text-color-2)" }}
              >
                최대:
              </span>
              <input
                className={style.fieldInput}
                type="number"
                style={{ width: "50px", fontSize: "12px", padding: "3px 6px" }}
                value={field.validation?.max ?? 5}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      max: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <input
                className={style.fieldInput}
                style={{ fontSize: "12px", padding: "3px 6px", flex: 1 }}
                placeholder="최소 레이블"
                value={field.validation?.minLabel ?? ""}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      minLabel: e.target.value,
                    },
                  })
                }
              />
              <input
                className={style.fieldInput}
                style={{ fontSize: "12px", padding: "3px 6px", flex: 1 }}
                placeholder="최대 레이블"
                value={field.validation?.maxLabel ?? ""}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      maxLabel: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        );
      case "date":
      case "multiDate":
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginTop: "4px",
            }}
          >
            <div
              style={{ display: "flex", gap: "8px", alignItems: "center" }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-color-2)",
                  minWidth: "50px",
                }}
              >
                시작일:
              </span>
              <input
                className={style.fieldInput}
                type="date"
                style={{ fontSize: "12px", padding: "3px 6px", flex: 1 }}
                value={field.validation?.minDate ?? ""}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      minDate: e.target.value,
                    },
                  })
                }
              />
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-color-2)",
                  minWidth: "50px",
                }}
              >
                종료일:
              </span>
              <input
                className={style.fieldInput}
                type="date"
                style={{ fontSize: "12px", padding: "3px 6px", flex: 1 }}
                value={field.validation?.maxDate ?? ""}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      maxDate: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div
              style={{ display: "flex", gap: "6px", alignItems: "center" }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-color-2)",
                  minWidth: "50px",
                }}
              >
                허용 요일:
              </span>
              {["월", "화", "수", "목", "금", "토", "일"].map(
                (dayLabel, i) => {
                  const dayNum = [1, 2, 3, 4, 5, 6, 0][i];
                  const allowed: number[] =
                    field.validation?.allowedDays ?? [0, 1, 2, 3, 4, 5, 6];
                  const checked = allowed.includes(dayNum);
                  return (
                    <label
                      key={dayNum}
                      style={{
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...allowed, dayNum]
                            : allowed.filter((d) => d !== dayNum);
                          updateField(fieldIndex, {
                            validation: {
                              ...field.validation,
                              allowedDays: next,
                            },
                          });
                        }}
                      />
                      {dayLabel}
                    </label>
                  );
                }
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: "4px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{ fontSize: "12px", color: "var(--text-color-2)" }}
              >
                선택 가능:
              </span>
              <input
                className={style.fieldInput}
                type="number"
                min={0}
                style={{
                  fontSize: "12px",
                  padding: "3px 6px",
                  width: "40px",
                  textAlign: "center",
                }}
                value={field.validation?.availableFromDays ?? 1}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      availableFromDays: Number(e.target.value),
                    },
                  })
                }
              />
              <span
                style={{ fontSize: "11px", color: "var(--text-color-2)" }}
              >
                일 전
              </span>
              <input
                className={style.fieldInput}
                type="time"
                style={{
                  fontSize: "12px",
                  padding: "3px 6px",
                  width: "90px",
                }}
                value={field.validation?.availableFrom ?? ""}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      availableFrom: e.target.value,
                    },
                  })
                }
              />
              <span
                style={{ fontSize: "11px", color: "var(--text-color-2)" }}
              >
                ~
              </span>
              <input
                className={style.fieldInput}
                type="number"
                min={0}
                style={{
                  fontSize: "12px",
                  padding: "3px 6px",
                  width: "40px",
                  textAlign: "center",
                }}
                value={field.validation?.availableUntilDays ?? 0}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      availableUntilDays: Number(e.target.value),
                    },
                  })
                }
              />
              <span
                style={{ fontSize: "11px", color: "var(--text-color-2)" }}
              >
                일 후
              </span>
              <input
                className={style.fieldInput}
                type="time"
                style={{
                  fontSize: "12px",
                  padding: "3px 6px",
                  width: "90px",
                }}
                value={field.validation?.availableUntil ?? ""}
                onChange={(e) =>
                  updateField(fieldIndex, {
                    validation: {
                      ...field.validation,
                      availableUntil: e.target.value,
                    },
                  })
                }
              />
            </div>
            {field.validation?.availableFrom &&
              field.validation?.availableUntil &&
              (() => {
                const fromDays = field.validation?.availableFromDays ?? 1;
                const untilDays = field.validation?.availableUntilDays ?? 0;
                const fromLabel =
                  fromDays === 0
                    ? "당일"
                    : fromDays === 1
                    ? "전날"
                    : `${fromDays}일 전`;
                const untilLabel =
                  untilDays === 0 ? "당일" : `${untilDays}일 후`;
                return (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-color-2)",
                      fontStyle: "italic",
                    }}
                  >
                    예: 3/5 선택 → {fromLabel}{" "}
                    {field.validation.availableFrom} ~ {untilLabel}{" "}
                    {field.validation.availableUntil}
                  </div>
                );
              })()}
          </div>
        );
      case "counter":
        return (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              marginTop: "4px",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
              최대 수량:
            </span>
            <input
              className={style.fieldInput}
              type="number"
              min={1}
              style={{ width: "60px", fontSize: "12px", padding: "3px 6px" }}
              value={field.validation?.maxCount || ""}
              onChange={(e) =>
                updateField(fieldIndex, {
                  validation: {
                    ...field.validation,
                    maxCount: Number(e.target.value),
                  },
                })
              }
            />
            <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
              건
            </span>
          </div>
        );
      case "approval": {
        const steps = field.approvalLine?.steps?.length
          ? field.approvalLine.steps
          : [{ order: 0, label: "1차 승인", mode: "pick" as const }];
        const writerUsers = [
          ...(board.writers?.users || []),
          ...((board as any).admins?.users || []),
        ];
        const seen = new Set<string>();
        const candidates = writerUsers.filter((u) => {
          if (seen.has(u.userId)) return false;
          seen.add(u.userId);
          return true;
        });

        const setSteps = (
          next: {
            order: number;
            label: string;
            mode: "fixed" | "pick";
            approver?: {
              user: string;
              userId: string;
              userName: string;
            };
          }[]
        ) => {
          updateField(fieldIndex, {
            approvalLine: {
              steps: next.map((s, i) => ({ ...s, order: i })),
            },
          });
        };

        return (
          <div
            style={{
              marginTop: "8px",
              padding: "10px",
              background: "var(--background-color-2)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-color-1)",
              }}
            >
              결재선
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-color-2)",
                lineHeight: 1.5,
              }}
            >
              단계는 이 양식에 저장되며, 복제·JSON 가져오기 시 함께 이동합니다.
              「지정」은 제출 시 응답자가 고르고, 「고정」은 미리 정한
              승인자입니다.
            </div>
            {steps.map((step, si) => (
              <div
                key={si}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  padding: "8px",
                  background: "var(--background-color)",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-color-2)",
                      minWidth: "28px",
                    }}
                  >
                    {si + 1}차
                  </span>
                  <input
                    className={style.fieldInput}
                    style={{ flex: 1, minWidth: "120px", fontSize: "12px" }}
                    value={step.label}
                    placeholder="단계 이름"
                    onChange={(e) => {
                      const next = steps.map((s, i) =>
                        i === si ? { ...s, label: e.target.value } : s
                      );
                      setSteps(next);
                    }}
                  />
                  <select
                    className={style.selectInput}
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                    value={step.mode}
                    onChange={(e) => {
                      const mode = e.target.value as "fixed" | "pick";
                      const next = steps.map((s, i) =>
                        i === si
                          ? {
                              ...s,
                              mode,
                              approver: mode === "pick" ? undefined : s.approver,
                            }
                          : s
                      );
                      setSteps(next);
                    }}
                  >
                    <option value="pick">지정(제출 시)</option>
                    <option value="fixed">고정</option>
                  </select>
                  <button
                    type="button"
                    className={style.removeBtn}
                    title="단계 삭제"
                    disabled={steps.length <= 1}
                    onClick={() =>
                      setSteps(steps.filter((_, i) => i !== si))
                    }
                  >
                    <MI icon="close" size={16} />
                  </button>
                </div>
                {step.mode === "fixed" && (
                  <select
                    className={style.selectInput}
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                    value={step.approver?.userId || ""}
                    onChange={(e) => {
                      const u = candidates.find(
                        (c) => c.userId === e.target.value
                      );
                      const next = steps.map((s, i) =>
                        i === si
                          ? {
                              ...s,
                              approver: u
                                ? {
                                    user: u.user,
                                    userId: u.userId,
                                    userName: u.userName,
                                  }
                                : undefined,
                            }
                          : s
                      );
                      setSteps(next);
                    }}
                  >
                    <option value="">승인자 선택</option>
                    {candidates.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.userName} ({u.userId})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            <button
              type="button"
              className={style.addOptionLink}
              onClick={() =>
                setSteps([
                  ...steps,
                  {
                    order: steps.length,
                    label: `${steps.length + 1}차 승인`,
                    mode: "pick",
                  },
                ])
              }
            >
              + 결재 단계 추가
            </button>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderAdvancedSettings = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    return (
      <div style={{ marginTop: "4px" }}>
        {/* 조건부 표시 */}
        <div style={{ marginBottom: "8px" }}>
          <label className={style.fieldCheckbox}>
            <input
              type="checkbox"
              checked={field.displayCondition?.enabled || false}
              onChange={(e) => {
                if (e.target.checked) {
                  addCondition(fieldIndex);
                } else {
                  updateDisplayCondition(fieldIndex, {
                    enabled: false,
                    logic: "and",
                    conditions: [],
                  });
                }
              }}
            />
            <span style={{ fontSize: "12px" }}>조건부 표시</span>
          </label>
          {renderConditionEditor(fieldIndex)}
        </div>

        {/* 중복 검사 */}
        {field.type !== "content" && (
        <div style={{ marginBottom: "8px" }}>
          <label className={style.fieldCheckbox}>
            <input
              type="checkbox"
              checked={field.duplicateCheck?.enabled || false}
              onChange={(e) => {
                updateDuplicateCheck(fieldIndex, {
                  enabled: e.target.checked,
                  mode: field.duplicateCheck?.mode || "free",
                  allowedCount: field.duplicateCheck?.allowedCount || 1,
                });
              }}
            />
            <span style={{ fontSize: "12px" }}>중복 검사</span>
          </label>
          {field.duplicateCheck?.enabled && (
            <div
              style={{
                marginTop: "4px",
                padding: "8px",
                background: "var(--background-color-2)",
                borderRadius: "6px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <select
                className={style.selectInput}
                style={{ fontSize: "12px", padding: "3px 6px" }}
                value={field.duplicateCheck.mode}
                onChange={(e) =>
                  updateDuplicateCheck(fieldIndex, {
                    ...field.duplicateCheck!,
                    mode: e.target.value as "free" | "preRegistration",
                  })
                }
              >
                <option value="free">자유</option>
                <option value="preRegistration">사전 등록</option>
              </select>
              <span
                style={{ fontSize: "12px", color: "var(--text-color-2)" }}
              >
                허용 수량:
              </span>
              <input
                className={style.fieldInput}
                type="number"
                min={1}
                style={{
                  width: "50px",
                  fontSize: "12px",
                  padding: "3px 6px",
                }}
                value={field.duplicateCheck.allowedCount}
                onChange={(e) =>
                  updateDuplicateCheck(fieldIndex, {
                    ...field.duplicateCheck!,
                    allowedCount: Number(e.target.value),
                  })
                }
              />
            </div>
          )}
        </div>
        )}

        {/* 퀴즈 설정 */}
        {renderQuizSettings(fieldIndex)}
      </div>
    );
  };

  // ─── Render active field card ───

  const renderActiveField = (field: TAltFormField, index: number) => (
    <>
      {/* Drag handle / move */}
      <div className={style.fieldDragHandle}>
        <button
          className={style.moveBtn}
          onClick={() => moveField(index, -1)}
          disabled={index === 0}
          title="위로 이동"
        >
          <MI icon="arrow_upward" size={18} />
        </button>
        <span className={style.dragDots}>
          <MI icon="drag_indicator" size={20} />
        </span>
        <button
          className={style.moveBtn}
          onClick={() => moveField(index, 1)}
          disabled={index === fields.length - 1}
          title="아래로 이동"
        >
          <MI icon="arrow_downward" size={18} />
        </button>
      </div>

      {/* Label + type selector */}
      <div className={style.fieldEditHeader}>
        <input
          className={style.gfLabelInput}
          placeholder={
            field.type === "content"
              ? "문서 제목 (선택)"
              : field.type === "docResponse"
                ? "문서 응답 제목"
                : "질문"
          }
          value={field.label}
          onChange={(e) => updateField(index, { label: e.target.value })}
        />
        <select
          className={style.fieldTypeSelectGf}
          value={field.type}
          onChange={(e) => {
            const nextType = e.target.value as TAltFormFieldType;
            const usesContentTemplate =
              nextType === "content" || nextType === "docResponse";
            updateField(index, {
              type: nextType,
              required: nextType === "content" ? false : field.required,
              content: usesContentTemplate
                ? field.content ?? ""
                : field.content,
              options:
                needsOptions(nextType) &&
                (!field.options || field.options.length === 0)
                  ? ["옵션 1", "옵션 2"]
                  : field.options,
              approvalLine:
                nextType === "approval"
                  ? field.approvalLine?.steps?.length
                    ? field.approvalLine
                    : {
                        steps: [
                          { order: 0, label: "1차 승인", mode: "pick" },
                        ],
                      }
                  : field.approvalLine,
            });
          }}
        >
          {FIELD_TYPE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.types.map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Field content (options, type settings) */}
      <div className={style.fieldEditContent}>
        {/* Options */}
        {needsOptions(field.type) && (
          <div>
            {field.options?.map((opt, oi) => (
              <div key={oi} className={style.optionRowGf}>
                {renderOptionIcon(field.type)}
                <input
                  className={style.optionInputGf}
                  value={opt}
                  onChange={(e) => updateOption(index, oi, e.target.value)}
                  placeholder={`옵션 ${oi + 1}`}
                />
                <button
                  className={style.removeBtn}
                  onClick={() => removeOption(index, oi)}
                >
                  <MI icon="close" size={18} />
                </button>
              </div>
            ))}
            <div className={style.optionRowGf}>
              {renderOptionIcon(field.type)}
              <button
                className={style.addOptionLink}
                onClick={() => addOption(index)}
              >
                옵션 추가
              </button>
            </div>
          </div>
        )}

        {/* Type-specific settings */}
        {renderFieldTypeSettings(index)}
      </div>

      {/* Advanced settings toggle */}
      <div className={style.advancedToggle}>
        <button
          onClick={() =>
            setExpandedField(
              expandedField === field._id ? null : field._id
            )
          }
        >
          {expandedField === field._id
            ? "▲ 고급 설정 닫기"
            : "▼ 고급 설정"}
        </button>
        {expandedField === field._id && renderAdvancedSettings(index)}
      </div>

      {/* Action bar */}
      <div className={style.fieldActionBar}>
        <div className={style.fieldActionLeft}>
          {field.type !== "content" && (
            <>
              <label className={style.requiredToggle}>
                필수
                <ToggleSwitch
                  checked={field.required}
                  onChange={(v) => updateField(index, { required: v })}
                />
              </label>
              <div className={style.actionDivider} />
              <select
                className={style.selectInput}
                style={{
                  minWidth: "100px",
                  padding: "4px 8px",
                  fontSize: "12px",
                }}
                value={field.permission}
                onChange={(e) =>
                  updateField(index, {
                    permission: e.target.value as "respondent" | "owner",
                  })
                }
              >
                <option value="respondent">응답자 입력</option>
                <option value="owner">관리자 입력</option>
              </select>
              {field.permission === "owner" && (
                <label className={style.fieldCheckbox}>
                  <input
                    type="checkbox"
                    checked={field.visibleToRespondent}
                    onChange={(e) =>
                      updateField(index, {
                        visibleToRespondent: e.target.checked,
                      })
                    }
                  />
                  응답자에게 공개
                </label>
              )}
            </>
          )}
          {field.type === "content" && (
            <span style={{ fontSize: "12px", color: "var(--text-color-2)" }}>
              문서 항목 · 응답값으로 저장되지 않음
            </span>
          )}
        </div>
        <div className={style.fieldActionRight}>
          <button
            className={style.iconBtn}
            onClick={() => duplicateField(index)}
            title="복사"
          >
            <MI icon="content_copy" size={20} />
          </button>
          <button
            className={`${style.iconBtn} ${style.iconBtnDanger}`}
            onClick={() => removeField(index)}
            title="삭제"
          >
            <MI icon="delete" size={20} />
          </button>
        </div>
      </div>
    </>
  );

  // ─── Floating toolbar ───

  const renderFloatingToolbar = (index: number) => (
    <div className={style.fieldAddToolbar} data-field-toolbar>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1, "text")}
        title="단답형"
      >
        <MI icon="short_text" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1, "textarea")}
        title="장문형"
      >
        <MI icon="notes" size={22} />
      </button>
      <div className={style.toolbarDivider} />
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1, "radio")}
        title="객관식 질문"
      >
        <MI icon="radio_button_checked" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1, "checkbox")}
        title="체크박스"
      >
        <MI icon="check_box" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1, "select")}
        title="드롭다운"
      >
        <MI icon="arrow_drop_down_circle" size={22} />
      </button>
      <div className={style.toolbarDivider} />
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1, "content")}
        title="문서"
      >
        <MI icon="article" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1, "docResponse")}
        title="문서 응답"
      >
        <MI icon="edit_note" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1, "date")}
        title="날짜"
      >
        <MI icon="calendar_today" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldAtIndex(index + 1)}
        title="항목 추가"
      >
        <MI icon="add_circle_outline" size={22} />
      </button>
    </div>
  );

  // ─── Main render ───

  return (
    <div className={style.builderContainer}>
      {/* Header */}
      <div className={style.builderHeader}>
        <div className={style.builderHeaderLeft}>
          <button className={style.backBtn} onClick={onBack}>
            <Svg type="chevronLeft" width="20px" height="20px" />
          </button>
          <span style={{ fontSize: "16px", fontWeight: 600 }}>양식 관리</span>
          <span
            className={`${style.formCardBadge} ${
              isDraft ? style.badgePending : style.badgeOpen
            }`}
            style={{ marginLeft: 8 }}
          >
            {isDraft ? "비공개" : "공개"}
          </span>
        </div>
        <div className={style.builderHeaderActions}>
          {currentFormId && !isDraft && onCopyFormLink && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="링크 복사"
              onClick={() => onCopyFormLink(currentFormId)}
            >
              <Svg type="link" width="20px" height="20px" />
            </button>
          )}
          {currentFormId && onRespondForm && !isDraft && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="응답하기"
              onClick={() => onRespondForm(currentFormId)}
            >
              <Svg type="edit" width="20px" height="20px" />
            </button>
          )}
          {currentFormId && !isDraft && (
            <button
              type="button"
              className={style.formCardIconBtn}
              title="제출현황"
              onClick={() => setShowTracker(true)}
            >
              <Svg type="list_check" width="20px" height="20px" />
            </button>
          )}
          <button
            type="button"
            className={`${style.formCardIconBtn} ${
              isDirty ? style.formCardIconBtnDirty : ""
            }`}
            title={isSaving ? "저장 중..." : "저장"}
            onClick={() => handleSave("keep")}
            disabled={isSaving || isDeleting || (!isDirty && !!currentFormId)}
          >
            <Svg type="save" width="20px" height="20px" />
            <span className={style.builderActionLabel}>저장</span>
          </button>
          {isDraft ? (
            <button
              type="button"
              className={style.formCardIconBtn}
              title={isSaving ? "공개 중..." : "공개"}
              onClick={() => handleSave("public")}
              disabled={isSaving || isDeleting || !title.trim()}
              style={{ color: "var(--status-success)" }}
            >
              <Svg type="unarchive" width="20px" height="20px" />
              <span className={style.builderActionLabel}>공개</span>
            </button>
          ) : (
            <button
              type="button"
              className={style.formCardIconBtn}
              title={isSaving ? "비공개 전환 중..." : "비공개"}
              onClick={() => handleSave("private")}
              disabled={isSaving || isDeleting || !title.trim()}
            >
              <Svg type="archive" width="20px" height="20px" />
              <span className={style.builderActionLabel}>비공개</span>
            </button>
          )}
          {currentFormId && isDraft && (
            <button
              type="button"
              className={`${style.formCardIconBtn} ${style.formCardIconBtnDanger}`}
              title="삭제"
              onClick={requestDelete}
              disabled={isSaving || isDeleting}
            >
              <Svg type="trash" width="20px" height="20px" />
              <span className={style.builderActionLabel}>삭제</span>
            </button>
          )}
        </div>
      </div>

      <div className={style.builderBody} ref={builderBodyRef}>
        {/* Title Card */}
        <div className={`${style.gfCard} ${style.titleCard}`}>
          <div className={style.titleCardAccent} />
          <div className={style.titleCardBody}>
            <input
              className={style.gfTitleInput}
              placeholder="양식 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className={style.gfDescInput}
              placeholder="양식 설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* 양식 / 설정 탭 */}
        <div className={style.builderTabBar}>
          <div className={style.tabContainer}>
            <button
              type="button"
              className={`${style.tab} ${
                builderTab === "form" ? style.tabActive : ""
              }`}
              onClick={() => setBuilderTab("form")}
            >
              양식
            </button>
            <button
              type="button"
              className={`${style.tab} ${
                builderTab === "settings" ? style.tabActive : ""
              }`}
              onClick={() => setBuilderTab("settings")}
            >
              설정
            </button>
          </div>
        </div>

        {builderTab === "settings" && (
          <div className={`${style.gfCard} ${style.settingsCard}`}>
            <div className={style.settingsPanel}>
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>시작일</span>
                <input
                  type="datetime-local"
                  className={style.settingsDateInput}
                  value={settings.openAt}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, openAt: e.target.value }))
                  }
                />
              </div>
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>마감일</span>
                <input
                  type="datetime-local"
                  className={style.settingsDateInput}
                  value={settings.closeAt}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, closeAt: e.target.value }))
                  }
                />
              </div>
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>재제출 허용</span>
                <div className={style.settingsToggle}>
                  <ToggleSwitch
                    checked={settings.allowResubmit}
                    disabled={settings.allowMultipleResponses}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, allowResubmit: v }))
                    }
                  />
                  <span className={style.settingsToggleText}>
                    {settings.allowResubmit ? "허용" : "비허용"}
                  </span>
                </div>
              </div>
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>복수 응답 허용</span>
                <div className={style.settingsToggle}>
                  <ToggleSwitch
                    checked={settings.allowMultipleResponses}
                    onChange={(v) =>
                      setSettings((s) => ({
                        ...s,
                        allowMultipleResponses: v,
                        ...(v && { allowResubmit: false }),
                      }))
                    }
                  />
                  <span className={style.settingsToggleText}>
                    {settings.allowMultipleResponses ? "허용" : "비허용"}
                  </span>
                </div>
              </div>
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>퀴즈 모드</span>
                <div className={style.settingsToggle}>
                  <ToggleSwitch
                    checked={settings.quizMode}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, quizMode: v }))
                    }
                  />
                  <span className={style.settingsToggleText}>
                    {settings.quizMode ? "사용" : "미사용"}
                  </span>
                </div>
              </div>
              {settings.quizMode && (
                <>
                  <div className={style.settingsItem}>
                    <span className={style.settingsLabel}>점수 공개</span>
                    <select
                      className={style.selectInput}
                      style={{ fontSize: "13px", padding: "4px 8px" }}
                      value={settings.quizSettings.scoreReveal}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          quizSettings: {
                            ...s.quizSettings,
                            scoreReveal: e.target
                              .value as TQuizSettings["scoreReveal"],
                          },
                        }))
                      }
                    >
                      <option value="immediately">제출 즉시</option>
                      <option value="afterDeadline">마감 후</option>
                      <option value="never">비공개</option>
                    </select>
                  </div>
                  <div className={style.settingsItem}>
                    <span className={style.settingsLabel}>정답 공개</span>
                    <select
                      className={style.selectInput}
                      style={{ fontSize: "13px", padding: "4px 8px" }}
                      value={settings.quizSettings.answerReveal}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          quizSettings: {
                            ...s.quizSettings,
                            answerReveal: e.target
                              .value as TQuizSettings["answerReveal"],
                          },
                        }))
                      }
                    >
                      <option value="immediately">제출 즉시</option>
                      <option value="afterDeadline">마감 후</option>
                      <option value="never">비공개</option>
                    </select>
                  </div>
                </>
              )}
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>직접 입력 모드</span>
                <div className={style.settingsToggle}>
                  <ToggleSwitch
                    checked={settings.directInputMode}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, directInputMode: v }))
                    }
                  />
                  <span className={style.settingsToggleText}>
                    {settings.directInputMode ? "사용" : "미사용"}
                  </span>
                </div>
              </div>
              {settings.directInputMode && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-color-2)",
                    padding: "4px 0",
                  }}
                >
                  모든 필드가 관리자 입력으로 설정됩니다. Sheet에서 직접
                  데이터를 입력하세요.
                </div>
              )}
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>본인 응답 확인</span>
                <div className={style.settingsToggle}>
                  <ToggleSwitch
                    checked={settings.showOwnResponse}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, showOwnResponse: v }))
                    }
                  />
                  <span className={style.settingsToggleText}>
                    {settings.showOwnResponse ? "허용" : "비허용"}
                  </span>
                </div>
              </div>
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>응답 결과 공유</span>
                <div className={style.settingsToggle}>
                  <ToggleSwitch
                    checked={settings.shareResponses}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, shareResponses: v }))
                    }
                  />
                  <span className={style.settingsToggleText}>
                    {settings.shareResponses ? "공개" : "비공개"}
                  </span>
                </div>
              </div>
              <div className={style.settingsItem}>
                <span className={style.settingsLabel}>관리자 필드 공개</span>
                <div className={style.settingsToggle}>
                  <ToggleSwitch
                    checked={settings.showOwnerFields}
                    onChange={(v) =>
                      setSettings((s) => ({ ...s, showOwnerFields: v }))
                    }
                  />
                  <span className={style.settingsToggleText}>
                    {settings.showOwnerFields ? "공개" : "비공개"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {builderTab === "form" && (
          <>
            {/* Field Cards */}
            {fields.map((field, index) => {
              const isActive = activeFieldId === field._id;
              return (
                <div key={field._id} className={style.fieldCardRow}>
                  <div
                    data-field-card
                    className={`${style.fieldCardGf} ${
                      isActive
                        ? style.fieldCardActive
                        : style.fieldCardInactive
                    }`}
                    onClick={() => {
                      if (!isActive) setActiveFieldId(field._id);
                    }}
                  >
                    {isActive ? (
                      renderActiveField(field, index)
                    ) : (
                      <div className={style.fieldCollapsedContent}>
                        <span className={style.fieldCollapsedLabel}>
                          {field.label ||
                            (field.type === "content"
                              ? "(문서)"
                              : field.type === "docResponse"
                                ? "(문서 응답)"
                                : "(이름 없음)")}
                          {field.required && (
                            <span className={style.requiredMark}> *</span>
                          )}
                        </span>
                        <span className={style.fieldCollapsedType}>
                          {FIELD_TYPE_LABELS[field.type]}
                        </span>
                      </div>
                    )}
                  </div>

                  {isActive && renderFloatingToolbar(index)}
                </div>
              );
            })}

            {/* Add field button */}
            <button className={style.addFieldBtn} onClick={addField}>
              + 항목 추가
            </button>
          </>
        )}
      </div>

      {showTracker && currentFormId && (
        <AltSubmissionTracker
          form={{ _id: currentFormId, title } as TAltForm}
          onClose={() => setShowTracker(false)}
        />
      )}

      {showDeleteConfirm && (
        <Popup
          title="양식 삭제"
          setState={(v: boolean) => {
            if (!v && !isDeleting) setShowDeleteConfirm(false);
          }}
          closeBtn={!isDeleting}
          style={{ maxWidth: "420px", width: "100%" }}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <Button
                type="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                type="ghost"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{ color: "var(--status-error)" }}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          }
        >
          <div style={{ padding: "8px 4px", lineHeight: 1.6 }}>
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--status-error-bg)",
                color: "var(--status-error)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              경고: 삭제하면 복구할 수 없습니다.
            </div>
            <strong>{title || "양식"}</strong> 양식을 정말 삭제하시겠습니까?
            <br />
            <span style={{ color: "var(--text-color-2)", fontSize: 13 }}>
              연결된 응답·기록 데이터도 함께 삭제됩니다. 이 작업은 되돌릴 수
              없습니다.
            </span>
          </div>
        </Popup>
      )}
    </div>
  );
};

export default AltFormBuilder;
