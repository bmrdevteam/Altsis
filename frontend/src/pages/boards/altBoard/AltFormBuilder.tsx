import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import {
  TAltForm,
  TAltFormField,
  TAltFormFieldType,
  TAssessmentSettings,
  TDisplayCondition,
  TDisplayConditionOperator,
  TDuplicateCheck,
  TFormRubric,
  TGradingMethod,
  TQuizSettings,
} from "types/altForm";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import useRegisterAlterActivity from "hooks/useRegisterAlterActivity";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Svg from "assets/svg/Svg";
import { MarkdownEditor } from "components/markdown";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import AltSubmissionTracker from "./AltSubmissionTracker";
import {
  WEEKDAY_LABELS_MON_FIRST,
  canEnableWeekdaySchedule,
  defaultWeekdaySchedule,
  estimateWeekdayOccurrenceCount,
  type TWeekdaySchedule,
} from "./weekdaySchedule";

const toLocalDatetimeString = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** 설정 라벨 옆 설명 — 아이콘 클릭 시 짧은 팝오버 */
const SettingsHint = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <span className={style.settingsHintWrap} ref={rootRef}>
      <button
        type="button"
        className={style.settingsHintBtn}
        aria-label="설명 보기"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Svg type="info-circle" width="14px" height="14px" />
      </button>
      {open && (
        <span className={style.settingsHintPopover} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
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
  multiSelect: "복수 선택",
  checkbox: "체크박스",
  radio: "객관식",
  userSelect: "사용자 선택",
  rating: "별점",
  scale: "척도",
  counter: "카운터",
  approval: "승인",
  link: "링크",
  content: "안내 문서",
  docResponse: "응답 문서",
};

/** 접힌 항목 목록용 Material 아이콘 (유형별 구분) */
const FIELD_TYPE_ICONS: Record<TAltFormFieldType, string> = {
  text: "short_text",
  textarea: "notes",
  number: "pin",
  date: "calendar_today",
  multiDate: "date_range",
  time: "schedule",
  file: "attach_file",
  select: "arrow_drop_down_circle",
  multiSelect: "checklist",
  checkbox: "check_box",
  radio: "radio_button_checked",
  userSelect: "person_search",
  rating: "star",
  scale: "linear_scale",
  counter: "exposure_plus_1",
  approval: "verified_user",
  link: "link",
  content: "article",
  docResponse: "edit_note",
};

const FIELD_TYPE_GROUPS: { label: string; types: TAltFormFieldType[] }[] = [
  { label: "텍스트", types: ["text", "textarea", "number"] },
  { label: "선택", types: ["radio", "checkbox", "select", "multiSelect"] },
  { label: "날짜/시간", types: ["date", "multiDate", "time"] },
  { label: "문서", types: ["content", "docResponse"] },
  { label: "평가 입력", types: ["rating", "scale", "counter"] },
  {
    label: "기타",
    types: ["file", "userSelect", "approval", "link"],
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
  /** 필수+복수일 때 목표 제출 횟수 */
  requiredResponseCount: number;
  requiredMode: boolean;
  openAt: string;
  closeAt: string;
  weekdaySchedule: TWeekdaySchedule;
  quizMode: boolean;
  quizSettings: TQuizSettings;
  assessmentMode: boolean;
  assessmentSettings: TAssessmentSettings;
  directInputMode: boolean;
  shareResponses: boolean;
  showOwnerFields: boolean;
  showOwnResponse: boolean;
};

const defaultAssessmentSettings = (): TAssessmentSettings => ({
  revealOn: "finalized",
  finalEvaluation: { mode: "both" },
});

type TRubricTemplate = "three" | "pass" | "blank";

const createRubricFromTemplate = (template: TRubricTemplate): TFormRubric => {
  const id = crypto.randomUUID();
  if (template === "pass") {
    return {
      id,
      title: "통과/미통과",
      levels: [
        { id: crypto.randomUUID(), label: "통과", points: 1 },
        { id: crypto.randomUUID(), label: "미통과", points: 0 },
      ],
    };
  }
  if (template === "blank") {
    return {
      id,
      title: "새 루브릭",
      levels: [{ id: crypto.randomUUID(), label: "", description: "", points: undefined }],
    };
  }
  return {
    id,
    title: "3단계 평가",
    levels: [
      { id: crypto.randomUUID(), label: "우수", description: "", points: 3 },
      { id: crypto.randomUUID(), label: "보통", description: "", points: 2 },
      { id: crypto.randomUUID(), label: "미흡", description: "", points: 1 },
    ],
  };
};

const rubricSummaryText = (rubric: TFormRubric): string => {
  const n = rubric.levels?.length || 0;
  const pts = (rubric.levels || [])
    .map((l) => l.points)
    .filter((p): p is number => p != null && Number.isFinite(Number(p)))
    .map(Number);
  if (n === 0) return "수준 없음";
  if (pts.length === 0) return `${n}수준`;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  return min === max ? `${n}수준 · ${max}점` : `${n}수준 · ${min}~${max}점`;
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
    requiredResponseCount: 2,
    requiredMode: false,
    openAt: "",
    closeAt: "",
    weekdaySchedule: defaultWeekdaySchedule(),
    quizMode: false,
    quizSettings: {
      scoreReveal: "immediately",
      answerReveal: "afterDeadline",
      showWrongMarks: true,
    },
    assessmentMode: false,
    assessmentSettings: defaultAssessmentSettings(),
    directInputMode: false,
    shareResponses: false,
    showOwnerFields: false,
    showOwnResponse: true,
  });
  const [rubrics, setRubrics] = useState<TFormRubric[]>([]);
  const [expandedRubricIds, setExpandedRubricIds] = useState<Set<string>>(
    () => new Set()
  );
  const [showRubricTemplates, setShowRubricTemplates] = useState(false);
  const [rubricDragIndex, setRubricDragIndex] = useState<number | null>(null);
  const [rubricDragOverIndex, setRubricDragOverIndex] = useState<number | null>(
    null
  );
  const [levelDrag, setLevelDrag] = useState<{
    rubricId: string;
    index: number;
  } | null>(null);
  const [levelDragOver, setLevelDragOver] = useState<{
    rubricId: string;
    index: number;
  } | null>(null);
  const rubricTemplateRef = useRef<HTMLDivElement>(null);
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
  /** 필드 추가/복제 후 새 카드로 스크롤 */
  const shouldScrollToActiveRef = useRef(false);

  useRegisterAlterActivity({
    enabled: !isLoading,
    label: board?.name ? `${board.name} · 활동` : "활동 작성",
    boardId: board?._id,
    boardName: board?.name,
    getActivity: () => ({
      title,
      description,
      fields,
      settings,
      rubrics,
    }),
    setTitle,
    setDescription,
    setFields,
    setSettings,
    setRubrics,
  });

  const getSnapshot = useCallback(
    (
      next?: Partial<{
        title: string;
        description: string;
        fields: TAltFormField[];
        settings: Settings;
        rubrics: TFormRubric[];
      }>
    ) =>
      JSON.stringify({
        title: (next?.title ?? title).trim(),
        description: (next?.description ?? description).trim(),
        fields: next?.fields ?? fields,
        settings: next?.settings ?? settings,
        rubrics: next?.rubrics ?? rubrics,
      }),
    [title, description, fields, settings, rubrics]
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
          requiredResponseCount:
            form.settings.requiredResponseCount &&
            form.settings.requiredResponseCount >= 1
              ? Math.floor(form.settings.requiredResponseCount)
              : 2,
          requiredMode: form.settings.requiredMode === true,
          openAt: form.settings.openAt
            ? toLocalDatetimeString(new Date(form.settings.openAt))
            : "",
          closeAt: form.settings.closeAt
            ? toLocalDatetimeString(new Date(form.settings.closeAt))
            : "",
          weekdaySchedule: form.settings.weekdaySchedule?.enabled
            ? {
                enabled: true,
                daysOfWeek: Array.isArray(form.settings.weekdaySchedule.daysOfWeek)
                  ? form.settings.weekdaySchedule.daysOfWeek.map(Number)
                  : defaultWeekdaySchedule().daysOfWeek,
                startTime:
                  form.settings.weekdaySchedule.startTime ||
                  defaultWeekdaySchedule().startTime,
                endTime:
                  form.settings.weekdaySchedule.endTime ||
                  defaultWeekdaySchedule().endTime,
              }
            : defaultWeekdaySchedule(),
          quizMode: form.settings.quizMode || false,
          quizSettings: form.settings.quizSettings || {
            scoreReveal: "immediately",
            answerReveal: "afterDeadline",
            showWrongMarks: true,
          },
          assessmentMode: form.settings.assessmentMode || false,
          assessmentSettings: defaultAssessmentSettings(),
          directInputMode: form.settings.directInputMode || false,
          shareResponses: form.settings.shareResponses || false,
          showOwnerFields: form.settings.showOwnerFields || false,
          showOwnResponse: form.settings.showOwnResponse !== false,
        };
        const nextRubrics = form.rubrics || [];
        setTitle(form.title);
        setDescription(form.description);
        setFields(form.fields);
        setSettings(nextSettings);
        setRubrics(nextRubrics);
        setExpandedRubricIds(
          nextRubrics.length === 1
            ? new Set([nextRubrics[0].id])
            : new Set()
        );
        setIsDraft(!!form.isDraft);
        setCurrentFormId(form._id);
        savedSnapshotRef.current = JSON.stringify({
          title: form.title.trim(),
          description: (form.description || "").trim(),
          fields: form.fields,
          settings: nextSettings,
          rubrics: nextRubrics,
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

  // 요일마다: 기간·요일 기준 예상 회차로 목표 제출 횟수 자동 반영
  useEffect(() => {
    if (isLoading) return;
    if (
      !settings.weekdaySchedule.enabled ||
      !canEnableWeekdaySchedule(settings)
    ) {
      return;
    }
    const est = estimateWeekdayOccurrenceCount({
      allowResubmit: settings.allowResubmit,
      requiredMode: settings.requiredMode,
      allowMultipleResponses: settings.allowMultipleResponses,
      openAt: settings.openAt
        ? new Date(settings.openAt).toISOString()
        : undefined,
      closeAt: settings.closeAt
        ? new Date(settings.closeAt).toISOString()
        : undefined,
      weekdaySchedule: settings.weekdaySchedule,
    });
    if (est == null || est < 1) return;
    setSettings((s) =>
      s.requiredResponseCount === est
        ? s
        : { ...s, requiredResponseCount: est }
    );
  }, [
    isLoading,
    settings.weekdaySchedule.enabled,
    settings.weekdaySchedule.daysOfWeek.join(","),
    settings.weekdaySchedule.startTime,
    settings.weekdaySchedule.endTime,
    settings.requiredMode,
    settings.allowMultipleResponses,
    settings.openAt,
    settings.closeAt,
  ]);

  /**
   * @param visibility keep=현재 상태 유지, private=비공개, public=공개
   */
  const handleSave = async (visibility: "keep" | "private" | "public") => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (
      settings.weekdaySchedule.enabled &&
      canEnableWeekdaySchedule(settings)
    ) {
      if (settings.weekdaySchedule.daysOfWeek.length === 0) {
        alert("요일마다: 요일을 하나 이상 선택하세요.");
        return;
      }
      const [sh, sm] = settings.weekdaySchedule.startTime
        .split(":")
        .map(Number);
      const [eh, em] = settings.weekdaySchedule.endTime.split(":").map(Number);
      if (
        !Number.isFinite(sh) ||
        !Number.isFinite(eh) ||
        eh * 60 + em <= sh * 60 + sm
      ) {
        alert("요일마다: 종료 시각은 시작 시각보다 뒤여야 합니다.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const asDraft =
        visibility === "keep" ? isDraft : visibility === "private";
      const data = {
        title: title.trim(),
        description: description.trim(),
        fields: fields.map((f, i) => ({ ...f, order: i })),
        rubrics: settings.assessmentMode ? rubrics : [],
        settings: {
          allowResubmit: settings.allowResubmit,
          allowMultipleResponses: settings.allowMultipleResponses,
          requiredMode: settings.requiredMode,
          requiredResponseCount:
            settings.requiredMode && settings.allowMultipleResponses
              ? Math.max(1, Math.floor(settings.requiredResponseCount) || 1)
              : undefined,
          openAt: settings.openAt ? new Date(settings.openAt).toISOString() : undefined,
          closeAt: settings.closeAt ? new Date(settings.closeAt).toISOString() : undefined,
          weekdaySchedule:
            settings.weekdaySchedule.enabled &&
            canEnableWeekdaySchedule(settings)
              ? {
                  enabled: true,
                  daysOfWeek: settings.weekdaySchedule.daysOfWeek,
                  startTime: settings.weekdaySchedule.startTime,
                  endTime: settings.weekdaySchedule.endTime,
                }
              : { enabled: false, daysOfWeek: [], startTime: "", endTime: "" },
          quizMode: settings.quizMode,
          quizSettings: settings.quizMode ? settings.quizSettings : undefined,
          assessmentMode: settings.assessmentMode,
          assessmentSettings: settings.assessmentMode
            ? {
                revealOn: "finalized" as const,
                finalEvaluation: { mode: "both" as const },
              }
            : undefined,
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
        rubrics: data.rubrics,
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

  const getAddFieldInsertIndex = () => {
    if (!activeFieldId) return fields.length;
    const idx = fields.findIndex((f) => f._id === activeFieldId);
    return idx >= 0 ? idx + 1 : fields.length;
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
    shouldScrollToActiveRef.current = true;
  };

  const addFieldOfType = (type: TAltFormFieldType = "text") => {
    addFieldAtIndex(getAddFieldInsertIndex(), type);
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
    shouldScrollToActiveRef.current = true;
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

  const reorderField = (from: number, to: number) => {
    setFields((prev) => {
      if (from < 0 || from >= prev.length) return prev;
      // to: 삽입 위치 (0…length)
      let insertAt = Math.max(0, Math.min(to, prev.length));
      // 제자리(바로 다음 칸 포함)면 변화 없음
      if (from === insertAt || from === insertAt - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (from < insertAt) insertAt -= 1;
      next.splice(insertAt, 0, item);
      return next;
    });
  };

  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragFromIndexRef = useRef<number | null>(null);
  const suppressCollapseClickRef = useRef(false);

  const getInsertIndex = (e: DragEvent, index: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    return e.clientY < mid ? index : index + 1;
  };

  const handleFieldDragStart = (e: DragEvent, index: number) => {
    suppressCollapseClickRef.current = false;
    dragFromIndexRef.current = index;
    setDragFromIndex(index);
    setDragOverIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(
        e.currentTarget.closest("[data-field-card]") || e.currentTarget,
        24,
        16
      );
    }
  };

  const handleFieldDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const insertAt = getInsertIndex(e, index);
    if (dragOverIndex !== insertAt) setDragOverIndex(insertAt);
  };

  const handleFieldDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    const from =
      dragFromIndexRef.current ??
      dragFromIndex ??
      parseInt(raw, 10);
    const insertAt = getInsertIndex(e, index);
    if (!Number.isNaN(from)) reorderField(from, insertAt);
    suppressCollapseClickRef.current = true;
    dragFromIndexRef.current = null;
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleFieldDragEnd = () => {
    if (dragFromIndexRef.current !== null) {
      suppressCollapseClickRef.current = true;
    }
    dragFromIndexRef.current = null;
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    if (!showRubricTemplates) return;
    const onDoc = (e: MouseEvent) => {
      if (
        rubricTemplateRef.current &&
        !rubricTemplateRef.current.contains(e.target as Node)
      ) {
        setShowRubricTemplates(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showRubricTemplates]);

  // 필드 추가·복제 후 새 카드가 보이도록 스크롤 + 라벨 입력 포커스
  useEffect(() => {
    if (!shouldScrollToActiveRef.current || !activeFieldId) return;
    shouldScrollToActiveRef.current = false;
    const id = activeFieldId;
    const scrollTimer = window.setTimeout(() => {
      const row = document.querySelector(
        `[data-field-id="${CSS.escape(id)}"]`
      ) as HTMLElement | null;
      if (!row) return;
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      const labelInput = row.querySelector(
        "input[placeholder]"
      ) as HTMLInputElement | null;
      labelInput?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(scrollTimer);
  }, [activeFieldId, fields]);

  const toggleRubricExpanded = (id: string) => {
    setExpandedRubricIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addRubricFromTemplate = (template: TRubricTemplate) => {
    const created = createRubricFromTemplate(template);
    setRubrics((prev) => [...prev, created]);
    setExpandedRubricIds((prev) => {
      const next = new Set(prev);
      // 2개 이상이면 새 것만 펼침
      if (rubrics.length + 1 >= 2) {
        return new Set([created.id]);
      }
      next.add(created.id);
      return next;
    });
    setShowRubricTemplates(false);
  };

  const duplicateRubric = (ri: number) => {
    const src = rubrics[ri];
    if (!src) return;
    const copied: TFormRubric = {
      id: crypto.randomUUID(),
      title: `${src.title || "루브릭"} (복사)`,
      levels: (src.levels || []).map((l) => ({
        id: crypto.randomUUID(),
        label: l.label,
        description: l.description || "",
        points: l.points,
      })),
    };
    setRubrics((prev) => {
      const next = [...prev];
      next.splice(ri + 1, 0, copied);
      return next;
    });
    setExpandedRubricIds(new Set([copied.id]));
  };

  const moveRubric = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setRubrics((prev) => {
      if (from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const moveLevel = (rubricId: string, from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setRubrics((prev) =>
      prev.map((r) => {
        if (r.id !== rubricId) return r;
        const levels = [...(r.levels || [])];
        if (from >= levels.length || to >= levels.length) return r;
        const [item] = levels.splice(from, 1);
        levels.splice(to, 0, item);
        return { ...r, levels };
      })
    );
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
      <div className={style.fieldSubPanel}>
        <div className={style.fieldSubPanelTitle}>퀴즈 설정</div>
        <div className={style.fieldSubPanelRow}>
          <span className={style.fieldSubPanelRowLabel}>배점</span>
          <div className={style.fieldSubPanelInline}>
            <input
              className={style.fieldSubPanelInput}
              type="number"
              min={0}
              value={field.points || 0}
              onChange={(e) =>
                updateField(fieldIndex, { points: Number(e.target.value) })
              }
            />
            <span className={style.fieldSubPanelHint}>점</span>
          </div>
        </div>
        {gradable ? (
          <div className={style.fieldSubPanelRow}>
            <span className={style.fieldSubPanelRowLabel}>정답</span>
            {field.type === "select" || field.type === "radio" ? (
              <select
                className={style.fieldSubPanelSelect}
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
                className={style.fieldSubPanelInput}
                type="number"
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
              <span className={style.fieldSubPanelHint}>
                체크박스/다중선택 — 옵션으로 정답 지정
              </span>
            )}
          </div>
        ) : (
          <div className={style.fieldSubPanelHint}>
            수동 채점 (자동 채점 불가)
          </div>
        )}
      </div>
    );
  };

  const renderAssessmentFieldSettings = (fieldIndex: number) => {
    if (!settings.assessmentMode) return null;
    const field = fields[fieldIndex];
    if (field.type === "content") return null;
    if (field.permission !== "respondent") return null;

    const method: TGradingMethod = field.gradingMethod || "none";
    const selectedRubricIds = field.rubricIds?.length
      ? field.rubricIds
      : field.rubricId
        ? [field.rubricId]
        : [];

    return (
      <div className={style.fieldSubPanel}>
        <div className={style.fieldSubPanelTitle}>평가 채점</div>
        <div className={style.fieldSubPanelRow}>
          <span className={style.fieldSubPanelRowLabel}>방식</span>
          <select
            className={style.fieldSubPanelSelect}
            value={method}
            onChange={(e) => {
              const next = e.target.value as TGradingMethod;
              updateField(fieldIndex, {
                gradingMethod: next === "none" ? undefined : next,
                rubricId: next === "rubric" ? field.rubricId : undefined,
                rubricIds: next === "rubric" ? field.rubricIds : undefined,
              });
            }}
          >
            <option value="none">채점 안 함</option>
            <option value="completion">자기선언(완료 시 배점)</option>
            <option value="manual_score">수동 점수</option>
            <option value="rubric">루브릭</option>
          </select>
        </div>
        {(method === "completion" || method === "manual_score") && (
          <div className={style.fieldSubPanelRow}>
            <span className={style.fieldSubPanelRowLabel}>배점</span>
            <div className={style.fieldSubPanelInline}>
              <input
                className={style.fieldSubPanelInput}
                type="number"
                min={0}
                value={field.points || 0}
                onChange={(e) =>
                  updateField(fieldIndex, { points: Number(e.target.value) })
                }
              />
              <span className={style.fieldSubPanelHint}>점</span>
            </div>
          </div>
        )}
        {method === "rubric" && (
          <div
            className={`${style.fieldSubPanelRow} ${style.fieldSubPanelRowTop}`}
          >
            <span className={style.fieldSubPanelRowLabel}>루브릭</span>
            <div>
              {rubrics.length === 0 ? (
                <div className={style.fieldSubPanelHint}>
                  설정 탭에서 양식 루브릭을 먼저 추가하세요.
                </div>
              ) : (
                <>
                  <div className={style.fieldSubPanelHint}>
                    여러 개 선택 가능 · 점수는 합산됩니다
                  </div>
                  <div className={style.rubricCheckList}>
                    {rubrics.map((r) => {
                      const selected = selectedRubricIds.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`${style.rubricCheckItem}${
                            selected ? ` ${style.rubricCheckItemSelected}` : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selectedRubricIds, r.id]
                                : selectedRubricIds.filter((id) => id !== r.id);
                              updateField(fieldIndex, {
                                rubricIds: next,
                                rubricId: next[0] || undefined,
                              });
                            }}
                          />
                          <span>{r.title}</span>
                          <span className={style.rubricCheckMeta}>
                            {r.levels?.length || 0}수준
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {method === "completion" && (
          <div className={style.fieldSubPanelHint}>
            체크·입력 등 값이 있으면 배점이 초안으로 반영됩니다.
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
              응답자에게 미리 채워지는 템플릿입니다. Alter가 채울 자리는{" "}
              <code>(작성)</code>, <code>(본문 작성)</code>,{" "}
              <code>(금액 작성)</code>처럼 괄호 안이 「작성」으로 끝나게
              표시하세요. (호환: <code>(이곳에 입력하세요.)</code>) 표·로고 등
              골격은 그대로 두고 칸만 바꾸면 됩니다.
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
      <div className={style.advancedPanel}>
        <div className={style.advancedOption}>
          <label className={style.advancedOptionLabel}>
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
            조건부 표시
          </label>
          {renderConditionEditor(fieldIndex)}
        </div>

        {field.type !== "content" && (
          <div className={style.advancedOption}>
            <label className={style.advancedOptionLabel}>
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
              중복 검사
            </label>
            {field.duplicateCheck?.enabled && (
              <div className={style.fieldSubPanel}>
                <div className={style.fieldSubPanelInline}>
                  <select
                    className={style.fieldSubPanelSelect}
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
                  <span className={style.fieldSubPanelHint}>허용 수량</span>
                  <input
                    className={style.fieldSubPanelInput}
                    type="number"
                    min={1}
                    value={field.duplicateCheck.allowedCount}
                    onChange={(e) =>
                      updateDuplicateCheck(fieldIndex, {
                        ...field.duplicateCheck!,
                        allowedCount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {renderQuizSettings(fieldIndex)}
        {renderAssessmentFieldSettings(fieldIndex)}
      </div>
    );
  };

  // ─── Render active field card ───

  const renderActiveField = (field: TAltFormField, index: number) => (
    <>
      {/* 드래그 핸들 — 드래그로 순서 변경, 클릭 시 접기 */}
      <div className={style.fieldDragHandle}>
        <span
          className={style.dragDots}
          draggable
          title="드래그하여 순서 변경 · 클릭하여 접기"
          onDragStart={(e) => handleFieldDragStart(e, index)}
          onDragEnd={handleFieldDragEnd}
          onClick={(e) => {
            e.stopPropagation();
            if (suppressCollapseClickRef.current) {
              suppressCollapseClickRef.current = false;
              return;
            }
            setActiveFieldId(null);
          }}
        >
          <MI icon="drag_indicator" size={20} />
        </span>
      </div>

      {/* Label + type selector */}
      <div className={style.fieldEditHeader}>
        <input
          className={style.gfLabelInput}
          placeholder={
            field.type === "content"
              ? "안내 문서 제목 (선택)"
              : field.type === "docResponse"
                ? "응답 문서 제목"
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
          type="button"
          className={style.advancedToggleBtn}
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

  // ─── Floating toolbar (양식 탭에서 항상 표시) ───

  const renderFloatingToolbar = () => (
    <div className={style.fieldAddToolbar} data-field-toolbar>
      <button
        type="button"
        className={`${style.toolbarBtn} ${style.toolbarBtnPrimary}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("text")}
        title="항목 추가 (단답형)"
        aria-label="항목 추가"
      >
        <MI icon="add" size={22} />
      </button>
      <div className={style.toolbarDivider} />
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("text")}
        title="단답형"
      >
        <MI icon="short_text" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("textarea")}
        title="장문형"
      >
        <MI icon="notes" size={22} />
      </button>
      <div className={style.toolbarDivider} />
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("radio")}
        title="객관식"
      >
        <MI icon="radio_button_checked" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("checkbox")}
        title="체크박스"
      >
        <MI icon="check_box" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("select")}
        title="드롭다운"
      >
        <MI icon="arrow_drop_down_circle" size={22} />
      </button>
      <div className={style.toolbarDivider} />
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("content")}
        title="안내 문서"
      >
        <MI icon="article" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("docResponse")}
        title="응답 문서"
      >
        <MI icon="edit_note" size={22} />
      </button>
      <button
        type="button"
        className={style.toolbarBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => addFieldOfType("date")}
        title="날짜"
      >
        <MI icon="calendar_today" size={22} />
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
          <span className={style.rendererHeaderTitle}>
            {title.trim() || "제목 없는 양식"}
          </span>
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
          <div className={style.titleCardBody}>
            <span className={style.titleCardEyebrow}>양식 정보</span>
            <input
              className={style.gfTitleInput}
              placeholder="양식 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="양식 제목"
            />
            <input
              className={style.gfDescInput}
              placeholder="양식 설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="양식 설명"
            />
          </div>
        </div>

        {/* 양식 / 설정 탭 — 보드 Tab과 동일한 밑줄형 */}
        <div className={style.builderTabBar}>
          <button
            type="button"
            className={`${style.builderTabItem} ${
              builderTab === "form" ? style.builderTabItemActive : ""
            }`}
            onClick={() => setBuilderTab("form")}
          >
            양식
          </button>
          <button
            type="button"
            className={`${style.builderTabItem} ${
              builderTab === "settings" ? style.builderTabItemActive : ""
            }`}
            onClick={() => setBuilderTab("settings")}
          >
            설정
          </button>
        </div>

        {builderTab === "settings" && (
          <div className={style.settingsCard}>
            <div className={style.settingsSections}>
              <section className={style.settingsSection}>
                <h4 className={style.settingsSectionTitle}>기간</h4>
                <div className={style.settingsSectionBody}>
                  <div className={style.settingsDateGrid}>
                    <div className={style.settingsItem}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>시작일</span>
                        <SettingsHint text="이 시각 이전에는 제출할 수 없습니다. 비우면 제한 없이 열려 있습니다." />
                      </div>
                      <input
                        type="datetime-local"
                        className={style.settingsDateInput}
                        value={settings.openAt}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, openAt: e.target.value }))
                        }
                        onClick={(e) => {
                          const el = e.currentTarget;
                          try {
                            el.showPicker?.();
                          } catch {
                            /* 일부 환경에서 showPicker 미지원/거부 */
                          }
                        }}
                      />
                    </div>
                    <div className={style.settingsItem}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>마감일</span>
                        <SettingsHint text="이 시각 이후에는 제출할 수 없습니다. 비우면 제한 없이 열려 있습니다." />
                      </div>
                      <input
                        type="datetime-local"
                        className={style.settingsDateInput}
                        value={settings.closeAt}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            closeAt: e.target.value,
                          }))
                        }
                        onClick={(e) => {
                          const el = e.currentTarget;
                          try {
                            el.showPicker?.();
                          } catch {
                            /* 일부 환경에서 showPicker 미지원/거부 */
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>요일마다</span>
                        <SettingsHint text="선택한 요일의 시작~종료 시각에만 할 일에 뜨고 제출할 수 있습니다. 회차당 1회이며, 목표 제출 횟수는 전체 합계입니다. 필수·복수 응답·시작일·마감일이 필요합니다." />
                      </div>
                      {!canEnableWeekdaySchedule(settings) && (
                        <p className={style.settingsInlineNote}>
                          필수 응답, 복수 응답, 시작일, 마감일이 필요합니다.
                        </p>
                      )}
                    </div>
                    <div className={style.settingsToggle}>
                      <ToggleSwitch
                        checked={settings.weekdaySchedule.enabled}
                        disabled={!canEnableWeekdaySchedule(settings)}
                        onChange={(v) =>
                          setSettings((s) => ({
                            ...s,
                            weekdaySchedule: {
                              ...s.weekdaySchedule,
                              enabled: v,
                            },
                          }))
                        }
                      />
                      <span className={style.settingsToggleText}>
                        {settings.weekdaySchedule.enabled ? "사용" : "미사용"}
                      </span>
                    </div>
                  </div>
                  {settings.weekdaySchedule.enabled &&
                    canEnableWeekdaySchedule(settings) && (
                      <div className={style.weekdaySchedulePanel}>
                        <div className={style.settingsItem}>
                          <div className={style.settingsLabelRow}>
                            <span className={style.settingsLabel}>요일</span>
                          </div>
                          <div className={style.weekdayChipRow}>
                            {WEEKDAY_LABELS_MON_FIRST.map(({ day, label }) => {
                              const selected =
                                settings.weekdaySchedule.daysOfWeek.includes(
                                  day
                                );
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  className={`${style.weekdayChip} ${
                                    selected ? style.weekdayChipSelected : ""
                                  }`}
                                  aria-pressed={selected}
                                  onClick={() =>
                                    setSettings((s) => {
                                      const set = new Set(
                                        s.weekdaySchedule.daysOfWeek
                                      );
                                      if (set.has(day)) set.delete(day);
                                      else set.add(day);
                                      return {
                                        ...s,
                                        weekdaySchedule: {
                                          ...s.weekdaySchedule,
                                          daysOfWeek: Array.from(set).sort(
                                            (a, b) => a - b
                                          ),
                                        },
                                      };
                                    })
                                  }
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className={style.settingsDateGrid}>
                          <div className={style.settingsItem}>
                            <div className={style.settingsLabelRow}>
                              <span className={style.settingsLabel}>
                                시작 시각
                              </span>
                            </div>
                            <input
                              type="time"
                              className={style.settingsDateInput}
                              value={settings.weekdaySchedule.startTime}
                              onChange={(e) =>
                                setSettings((s) => ({
                                  ...s,
                                  weekdaySchedule: {
                                    ...s.weekdaySchedule,
                                    startTime: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className={style.settingsItem}>
                            <div className={style.settingsLabelRow}>
                              <span className={style.settingsLabel}>
                                종료 시각
                              </span>
                            </div>
                            <input
                              type="time"
                              className={style.settingsDateInput}
                              value={settings.weekdaySchedule.endTime}
                              onChange={(e) =>
                                setSettings((s) => ({
                                  ...s,
                                  weekdaySchedule: {
                                    ...s.weekdaySchedule,
                                    endTime: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </section>

              <section className={style.settingsSection}>
                <h4 className={style.settingsSectionTitle}>제출·응답</h4>
                <div className={style.settingsSectionBody}>
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>복수 응답</span>
                        <SettingsHint text="허용하면 같은 사용자가 여러 번 제출할 수 있고, 기록에 여러 행으로 쌓입니다." />
                      </div>
                    </div>
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
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>응답 수정</span>
                        <SettingsHint text="허용하면 제출한 응답을 다시 열어 수정할 수 있습니다. 복수 응답이 켜져 있으면 사용할 수 없습니다." />
                      </div>
                      {settings.allowMultipleResponses && (
                        <p className={style.settingsInlineNote}>
                          복수 응답이 켜져 있어 사용할 수 없습니다.
                        </p>
                      )}
                    </div>
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
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>필수 응답</span>
                        <SettingsHint text="켜면 미제출로 표시되고 활동 뱃지에 포함됩니다. 복수 응답과 함께 쓰면 목표 횟수를 채울 때까지 n/n으로 표시됩니다." />
                      </div>
                    </div>
                    <div className={style.settingsToggle}>
                      <ToggleSwitch
                        checked={settings.requiredMode}
                        onChange={(v) =>
                          setSettings((s) => ({ ...s, requiredMode: v }))
                        }
                      />
                      <span className={style.settingsToggleText}>
                        {settings.requiredMode ? "필수" : "선택"}
                      </span>
                    </div>
                  </div>
                  {settings.requiredMode &&
                    settings.allowMultipleResponses && (
                      <div className={style.settingsNested}>
                        <div className={style.settingsNestedRow}>
                          <div className={style.settingsNestedText}>
                            <div className={style.settingsLabelRow}>
                              <span className={style.settingsNestedLabel}>
                                목표 제출 횟수
                              </span>
                              <SettingsHint text="목표에 도달하면 추가 제출은 할 수 없습니다. 요일마다를 켜면 기간·요일 기준 예상 회차로 자동 설정됩니다." />
                            </div>
                          </div>
                          <div className={style.settingsNestedControl}>
                            <input
                              type="number"
                              className={style.settingsNestedInput}
                              min={1}
                              step={1}
                              value={settings.requiredResponseCount}
                              disabled={
                                settings.weekdaySchedule.enabled &&
                                canEnableWeekdaySchedule(settings)
                              }
                              readOnly={
                                settings.weekdaySchedule.enabled &&
                                canEnableWeekdaySchedule(settings)
                              }
                              onChange={(e) => {
                                if (
                                  settings.weekdaySchedule.enabled &&
                                  canEnableWeekdaySchedule(settings)
                                ) {
                                  return;
                                }
                                const n = parseInt(e.target.value, 10);
                                setSettings((s) => ({
                                  ...s,
                                  requiredResponseCount:
                                    Number.isFinite(n) && n >= 1 ? n : 1,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>내 응답</span>
                        <SettingsHint text="허용하면 응답자가 제출한 내용을 다시 볼 수 있습니다." />
                      </div>
                    </div>
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
                </div>
              </section>

              <section className={style.settingsSection}>
                <h4 className={style.settingsSectionTitle}>채점·평가</h4>
                <div className={style.settingsSectionBody}>
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>퀴즈 모드</span>
                        <SettingsHint text="켜면 필드에 배점·정답을 넣을 수 있고, 제출 후 점수가 계산됩니다. 평가 모드와 함께 켤 수 없습니다." />
                      </div>
                    </div>
                    <div className={style.settingsToggle}>
                      <ToggleSwitch
                        checked={settings.quizMode}
                        onChange={(v) =>
                          setSettings((s) => ({
                            ...s,
                            quizMode: v,
                            assessmentMode: v ? false : s.assessmentMode,
                          }))
                        }
                      />
                      <span className={style.settingsToggleText}>
                        {settings.quizMode ? "사용" : "미사용"}
                      </span>
                    </div>
                  </div>
                  {settings.quizMode && (
                    <div className={style.settingsNested}>
                      <div className={style.settingsNestedRow}>
                        <div className={style.settingsLabelRow}>
                          <span className={style.settingsNestedLabel}>
                            점수 공개
                          </span>
                          <SettingsHint text="응답자에게 점수를 언제 보여줄지 정합니다. 제출 즉시 / 마감 후 / 비공개." />
                        </div>
                        <div className={style.settingsNestedControl}>
                          <select
                            className={style.settingsNestedSelect}
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
                      </div>
                      <div className={style.settingsNestedRow}>
                        <div className={style.settingsLabelRow}>
                          <span className={style.settingsNestedLabel}>
                            정답 공개
                          </span>
                          <SettingsHint text="응답자에게 정답을 언제 보여줄지 정합니다. 제출 즉시 / 마감 후 / 비공개." />
                        </div>
                        <div className={style.settingsNestedControl}>
                          <select
                            className={style.settingsNestedSelect}
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
                      </div>
                    </div>
                  )}
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>평가 모드</span>
                        <SettingsHint text="학생이 제출한 과제를 항목별·루브릭으로 채점하고, 확정 후 결과를 보여 줍니다. 퀴즈 모드와 함께 켤 수 없습니다." />
                      </div>
                    </div>
                    <div className={style.settingsToggle}>
                      <ToggleSwitch
                        checked={settings.assessmentMode}
                        onChange={(v) =>
                          setSettings((s) => ({
                            ...s,
                            assessmentMode: v,
                            quizMode: v ? false : s.quizMode,
                            assessmentSettings:
                              s.assessmentSettings || defaultAssessmentSettings(),
                          }))
                        }
                      />
                      <span className={style.settingsToggleText}>
                        {settings.assessmentMode ? "사용" : "미사용"}
                      </span>
                    </div>
                  </div>
                  {settings.assessmentMode && (
                    <div className={style.settingsNested}>
                      <div className={style.settingsRubricsBlock}>
                        <div className={style.settingsRubricsHeader}>
                          <div className={style.settingsRubricsHeaderText}>
                            <span className={style.settingsRubricsTitle}>
                              양식 루브릭
                            </span>
                            {rubrics.length === 0 && (
                              <span className={style.settingsRubricsHint}>
                                템플릿으로 빠르게 만들거나, 빈 루브릭부터 작성하세요.
                              </span>
                            )}
                          </div>
                          <div
                            className={style.settingsRubricsHeaderActions}
                            ref={rubricTemplateRef}
                          >
                            <button
                              type="button"
                              className={style.settingsRubricsAddBtn}
                              onClick={() =>
                                setShowRubricTemplates((v) => !v)
                              }
                            >
                              + 루브릭 추가
                            </button>
                            {showRubricTemplates && (
                              <div className={style.settingsRubricTemplateMenu}>
                                <button
                                  type="button"
                                  className={style.settingsRubricTemplateItem}
                                  onClick={() => addRubricFromTemplate("three")}
                                >
                                  <strong>3단계 평가</strong>
                                  <span>우수 / 보통 / 미흡 · 3·2·1점</span>
                                </button>
                                <button
                                  type="button"
                                  className={style.settingsRubricTemplateItem}
                                  onClick={() => addRubricFromTemplate("pass")}
                                >
                                  <strong>통과 / 미통과</strong>
                                  <span>2단계 · 1·0점</span>
                                </button>
                                <button
                                  type="button"
                                  className={style.settingsRubricTemplateItem}
                                  onClick={() => addRubricFromTemplate("blank")}
                                >
                                  <strong>빈 루브릭</strong>
                                  <span>수준을 직접 구성</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {rubrics.map((rubric, ri) => {
                          const expanded =
                            rubrics.length === 1 ||
                            expandedRubricIds.has(rubric.id);
                          const isDragging = rubricDragIndex === ri;
                          const isDragOver = rubricDragOverIndex === ri;
                          return (
                            <div
                              key={rubric.id}
                              className={`${style.settingsRubricCard}${
                                isDragging
                                  ? ` ${style.settingsRubricCardDragging}`
                                  : ""
                              }${
                                isDragOver
                                  ? ` ${style.settingsRubricCardDragOver}`
                                  : ""
                              }`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (rubricDragIndex == null) return;
                                setRubricDragOverIndex(ri);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (rubricDragIndex == null) return;
                                moveRubric(rubricDragIndex, ri);
                                setRubricDragIndex(null);
                                setRubricDragOverIndex(null);
                              }}
                            >
                              <div className={style.settingsRubricCardTop}>
                                <button
                                  type="button"
                                  className={style.settingsRubricDragHandle}
                                  title="드래그하여 순서 변경"
                                  draggable
                                  onDragStart={(e) => {
                                    setRubricDragIndex(ri);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      String(ri)
                                    );
                                  }}
                                  onDragEnd={() => {
                                    setRubricDragIndex(null);
                                    setRubricDragOverIndex(null);
                                  }}
                                >
                                  <MI icon="drag_indicator" size={18} />
                                </button>
                                {rubrics.length > 1 && (
                                  <button
                                    type="button"
                                    className={style.settingsRubricCollapseBtn}
                                    aria-label={
                                      expanded ? "접기" : "펼치기"
                                    }
                                    onClick={() =>
                                      toggleRubricExpanded(rubric.id)
                                    }
                                  >
                                    {expanded ? "▲" : "▼"}
                                  </button>
                                )}
                                <input
                                  className={style.settingsRubricTitleInput}
                                  value={rubric.title}
                                  onChange={(e) => {
                                    const title = e.target.value;
                                    setRubrics((prev) =>
                                      prev.map((r, i) =>
                                        i === ri ? { ...r, title } : r
                                      )
                                    );
                                  }}
                                  onFocus={() => {
                                    if (rubrics.length > 1) {
                                      setExpandedRubricIds(
                                        new Set([rubric.id])
                                      );
                                    }
                                  }}
                                />
                                <span className={style.settingsRubricSummaryChip}>
                                  {rubricSummaryText(rubric)}
                                </span>
                                <div className={style.settingsRubricCardActions}>
                                  <button
                                    type="button"
                                    className={style.settingsRubricGhostBtn}
                                    onClick={() => duplicateRubric(ri)}
                                  >
                                    복제
                                  </button>
                                  <button
                                    type="button"
                                    className={style.settingsRubricGhostBtn}
                                    onClick={() => {
                                      setRubrics((prev) =>
                                        prev.filter((_, i) => i !== ri)
                                      );
                                      setExpandedRubricIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(rubric.id);
                                        return next;
                                      });
                                    }}
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                              {expanded && (
                                <div className={style.settingsRubricCardBody}>
                                  <table className={style.settingsRubricTable}>
                                    <thead>
                                      <tr>
                                        <th className={style.settingsRubricLevelDragCell} />
                                        <th className={style.settingsRubricThLevel}>
                                          수준
                                        </th>
                                        <th className={style.settingsRubricThDesc}>
                                          설명
                                        </th>
                                        <th className={style.settingsRubricThPoints}>
                                          점수
                                        </th>
                                        <th className={style.settingsRubricThActions} />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(rubric.levels || []).map((level, li) => {
                                        const levelDragging =
                                          levelDrag?.rubricId === rubric.id &&
                                          levelDrag.index === li;
                                        const levelOver =
                                          levelDragOver?.rubricId ===
                                            rubric.id &&
                                          levelDragOver.index === li;
                                        return (
                                          <tr
                                            key={level.id}
                                            className={`${
                                              levelDragging
                                                ? style.settingsRubricLevelDragging
                                                : ""
                                            }${
                                              levelOver
                                                ? ` ${style.settingsRubricLevelDragOver}`
                                                : ""
                                            }`}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              if (
                                                !levelDrag ||
                                                levelDrag.rubricId !== rubric.id
                                              )
                                                return;
                                              setLevelDragOver({
                                                rubricId: rubric.id,
                                                index: li,
                                              });
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              if (
                                                !levelDrag ||
                                                levelDrag.rubricId !== rubric.id
                                              )
                                                return;
                                              moveLevel(
                                                rubric.id,
                                                levelDrag.index,
                                                li
                                              );
                                              setLevelDrag(null);
                                              setLevelDragOver(null);
                                            }}
                                          >
                                            <td
                                              className={
                                                style.settingsRubricLevelDragCell
                                              }
                                            >
                                              <button
                                                type="button"
                                                className={
                                                  style.settingsRubricDragHandle
                                                }
                                                title="드래그하여 순서 변경"
                                                draggable
                                                onDragStart={(e) => {
                                                  setLevelDrag({
                                                    rubricId: rubric.id,
                                                    index: li,
                                                  });
                                                  e.dataTransfer.effectAllowed =
                                                    "move";
                                                }}
                                                onDragEnd={() => {
                                                  setLevelDrag(null);
                                                  setLevelDragOver(null);
                                                }}
                                              >
                                                <MI
                                                  icon="drag_indicator"
                                                  size={16}
                                                />
                                              </button>
                                            </td>
                                            <td>
                                              <input
                                                className={
                                                  style.settingsRubricLevelInput
                                                }
                                                placeholder="수준"
                                                value={level.label}
                                                onChange={(e) => {
                                                  const label = e.target.value;
                                                  setRubrics((prev) =>
                                                    prev.map((r, i) =>
                                                      i !== ri
                                                        ? r
                                                        : {
                                                            ...r,
                                                            levels: r.levels.map(
                                                              (l, j) =>
                                                                j === li
                                                                  ? {
                                                                      ...l,
                                                                      label,
                                                                    }
                                                                  : l
                                                            ),
                                                          }
                                                    )
                                                  );
                                                }}
                                              />
                                            </td>
                                            <td>
                                              <input
                                                className={
                                                  style.settingsRubricLevelInput
                                                }
                                                placeholder="설명 (선택)"
                                                value={level.description || ""}
                                                onChange={(e) => {
                                                  const description =
                                                    e.target.value;
                                                  setRubrics((prev) =>
                                                    prev.map((r, i) =>
                                                      i !== ri
                                                        ? r
                                                        : {
                                                            ...r,
                                                            levels: r.levels.map(
                                                              (l, j) =>
                                                                j === li
                                                                  ? {
                                                                      ...l,
                                                                      description,
                                                                    }
                                                                  : l
                                                            ),
                                                          }
                                                    )
                                                  );
                                                }}
                                              />
                                            </td>
                                            <td>
                                              <input
                                                className={
                                                  style.settingsRubricLevelPoints
                                                }
                                                type="number"
                                                placeholder="점"
                                                value={level.points ?? ""}
                                                onChange={(e) => {
                                                  const raw = e.target.value;
                                                  const points =
                                                    raw === ""
                                                      ? undefined
                                                      : Number(raw);
                                                  setRubrics((prev) =>
                                                    prev.map((r, i) =>
                                                      i !== ri
                                                        ? r
                                                        : {
                                                            ...r,
                                                            levels: r.levels.map(
                                                              (l, j) =>
                                                                j === li
                                                                  ? {
                                                                      ...l,
                                                                      points,
                                                                    }
                                                                  : l
                                                            ),
                                                          }
                                                    )
                                                  );
                                                }}
                                              />
                                            </td>
                                            <td>
                                              <button
                                                type="button"
                                                className={
                                                  style.settingsRubricGhostBtn
                                                }
                                                aria-label="수준 삭제"
                                                onClick={() =>
                                                  setRubrics((prev) =>
                                                    prev.map((r, i) =>
                                                      i !== ri
                                                        ? r
                                                        : {
                                                            ...r,
                                                            levels:
                                                              r.levels.filter(
                                                                (_, j) =>
                                                                  j !== li
                                                              ),
                                                          }
                                                    )
                                                  )
                                                }
                                              >
                                                ×
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                  <button
                                    type="button"
                                    className={style.settingsRubricAddLevel}
                                    onClick={() =>
                                      setRubrics((prev) =>
                                        prev.map((r, i) =>
                                          i !== ri
                                            ? r
                                            : {
                                                ...r,
                                                levels: [
                                                  ...r.levels,
                                                  {
                                                    id: crypto.randomUUID(),
                                                    label: "새 수준",
                                                    description: "",
                                                    points: 0,
                                                  },
                                                ],
                                              }
                                        )
                                      )
                                    }
                                  >
                                    + 수준
                                  </button>
                                  <div className={style.settingsRubricPreview}>
                                    <div
                                      className={style.settingsRubricPreviewLabel}
                                    >
                                      채점 미리보기
                                    </div>
                                    <select
                                      className={style.settingsRubricPreviewSelect}
                                      defaultValue=""
                                      aria-label="채점 미리보기"
                                    >
                                      <option value="" disabled>
                                        수준 선택
                                      </option>
                                      {(rubric.levels || []).map((l) => (
                                        <option key={l.id} value={l.id}>
                                          {l.label || "(이름 없음)"}
                                          {l.points != null
                                            ? ` (${l.points}점)`
                                            : ""}
                                        </option>
                                      ))}
                                    </select>
                                    <div
                                      className={style.settingsRubricPreviewChips}
                                    >
                                      {(rubric.levels || []).map((l) => (
                                        <span
                                          key={l.id}
                                          className={
                                            style.settingsRubricPreviewChip
                                          }
                                          title={l.description || undefined}
                                        >
                                          {l.label || "(이름 없음)"}
                                          {l.points != null
                                            ? `(${l.points})`
                                            : ""}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className={style.settingsSection}>
                <h4 className={style.settingsSectionTitle}>운영</h4>
                <div className={style.settingsSectionBody}>
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>직접 입력 모드</span>
                        <SettingsHint text="응답 화면 제출 대신, 관리자가 기록(시트)에서 직접 행을 넣는 용도입니다." />
                      </div>
                    </div>
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
                </div>
              </section>

              <section className={style.settingsSection}>
                <h4 className={style.settingsSectionTitle}>공개·열람</h4>
                <div className={style.settingsSectionBody}>
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>결과 공유</span>
                        <SettingsHint text="공개하면 응답자도 권한 범위 안에서 다른 사람 응답 결과를 볼 수 있습니다." />
                      </div>
                    </div>
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
                  <div className={style.settingsItemRow}>
                    <div className={style.settingsItemText}>
                      <div className={style.settingsLabelRow}>
                        <span className={style.settingsLabel}>
                          관리자 필드 공개
                        </span>
                        <SettingsHint text="공개하면 관리자 전용 필드(승인·메모 등)를 응답자도 볼 수 있습니다." />
                      </div>
                    </div>
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
              </section>
            </div>
          </div>
        )}

        {builderTab === "form" && (
          <div className={style.formFieldsWithToolbar}>
            <div className={style.formFieldsList}>
              {fields.map((field, index) => {
                const isActive = activeFieldId === field._id;
                const isDragging = dragFromIndex === index;
                const showLineBefore =
                  dragOverIndex === index && dragFromIndex !== index;
                const showLineAfter =
                  dragOverIndex === index + 1 &&
                  dragFromIndex !== index &&
                  dragFromIndex !== index + 1;
                return (
                  <div
                    key={field._id}
                    data-field-id={field._id}
                    className={`${style.fieldCardRow} ${
                      showLineBefore ? style.fieldCardRowDragOverBefore : ""
                    } ${
                      showLineAfter ? style.fieldCardRowDragOverAfter : ""
                    } ${isDragging ? style.fieldCardRowDragging : ""}`}
                    onDragOver={(e) => handleFieldDragOver(e, index)}
                    onDrop={(e) => handleFieldDrop(e, index)}
                  >
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
                          <div className={style.fieldCollapsedMain}>
                            <span
                              className={style.dragDots}
                              draggable
                              title="드래그하여 순서 변경"
                              onDragStart={(e) =>
                                handleFieldDragStart(e, index)
                              }
                              onDragEnd={handleFieldDragEnd}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MI icon="drag_indicator" size={18} />
                            </span>
                            <span
                              className={style.fieldCollapsedIcon}
                              aria-hidden
                            >
                              <MI
                                icon={FIELD_TYPE_ICONS[field.type]}
                                size={18}
                              />
                            </span>
                            <span className={style.fieldCollapsedLabel}>
                              {field.label ||
                                (field.type === "content"
                                  ? "(안내 문서)"
                                  : field.type === "docResponse"
                                    ? "(응답 문서)"
                                    : "(이름 없음)")}
                              {field.required && (
                                <span className={style.requiredMark}> *</span>
                              )}
                            </span>
                          </div>
                          <span className={style.fieldCollapsedType}>
                            {FIELD_TYPE_LABELS[field.type]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {renderFloatingToolbar()}
          </div>
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
