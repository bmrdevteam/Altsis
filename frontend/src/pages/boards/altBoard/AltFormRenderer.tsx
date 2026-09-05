import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import {
  TAltForm,
  TAltFormField,
  TAssessmentData,
  TDisplayCondition,
} from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { TChatUser } from "types/chat";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import useRegisterAlterFormResponse from "hooks/useRegisterAlterFormResponse";
import { useAuth } from "contexts/authContext";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import {
  MarkdownEditor,
  MarkdownViewer,
  MarkdownWysiwygView,
} from "components/markdown";
import {
  formHasCirculationField,
  getApprovalCirculation,
  getApprovalComposeRows,
  getApprovalLineSteps,
  getCirculationConfig,
  getRequiredApprovalError,
  normalizeApprovalValue,
  TApprovalApprover,
} from "utils/approvalLine";
import { getRequiredResponseCount } from "./activityStatusVisual";
import {
  formatOccurrenceStatusLabel,
  getOpenOccurrences,
  hasSubmittedCurrentOccurrence,
  hasSubmittedOccurrence,
  isWeekdayScheduleEnabled,
} from "./weekdaySchedule";
import FieldRubricPanel, {
  getFieldRubrics,
  selectedLevelsFromDraft,
} from "./FieldRubricPanel";
import AssessmentResultBanner from "./AssessmentResultBanner";
import FilePreviewModal from "./FilePreviewModal";
import ApprovalCirculationPicker, {
  ApprovalUserSearchInput,
  CirculationUserChips,
  uniqueApprovalCandidates,
} from "./ApprovalCirculationPicker";
import ApprovalProgressBlock from "./ApprovalProgressBlock";
import TimePicker from "components/timePicker/TimePicker";
import FieldDocResources from "./FieldDocResources";
import SettingsHint from "./SettingsHint";
import LinkAttachModal from "./LinkAttachModal";
import FileAttachCard from "./FileAttachCard";
import LinkPreviewThumb from "./LinkPreviewThumb";
import { TFormFileRef } from "./formFilePreview";
import {
  isFileAnswerFile,
  isFileAnswerLink,
  linkDisplayTitle,
  linkPreviewHostname,
  sanitizeHttpUrl,
  youtubeThumbnailUrl,
} from "./formDocLink";
import {
  copyRowDataForReuse,
  filterReusedPickPeople,
  formatReusedDroppedNotice,
  mergeRowDataForEdit,
  seedComposePickDefaults,
  shouldApplyExternalViewMode,
  TFormViewMode,
} from "./reuseResponseDraft";
import FormAiChatField from "./FormAiChatField";
import { isAiChatRequiredMet } from "./formAiChat";
import {
  buildInProgressDraftList,
  canCreateAdditionalDraft,
  canSubmitReviewDraft,
  isDraftSheetRow,
  sortDraftRows,
  sortMyRowsForReview,
  sortSubmittedRows,
} from "./sheetRowDraft";
import {
  clearFormResponseDraft,
  formResponseDraftStorageKey,
  hasLocalComposeDraft,
  readFormResponseDraft,
} from "./formResponseLocalDraft";
import { useFormResponseDraft } from "./useFormResponseDraft";
import MultiSelectField from "./MultiSelectField";
import { getMyAltBoardRole, isFormRespondent } from "./formAccess";

type Props = {
  board: TBoard;
  formId: string;
  onBack: () => void;
  /** URL mode=respond|drafts|responses 로 시작. drafts는 작성으로 연다. */
  initialViewMode?: TFormViewMode;
  /** mode=responses일 때 이 행을 연다. 작성 중이면 해당 초안 칸. */
  initialReviewRowId?: string | null;
  /** standalone에서 URL mode 동기화 */
  onViewModeChange?: (mode: TFormViewMode) => void;
};

type DateInputWithOverlayProps = {
  value: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  onChange: (dateStr: string) => void;
};

const DateInputWithOverlay = ({
  value,
  min,
  max,
  disabled,
  onChange,
}: DateInputWithOverlayProps) => {
  const [focused, setFocused] = useState(false);
  const showOverlay = Boolean(value) && !focused;
  const formattedDate = value
    ? new Date(value + "T00:00:00").toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      })
    : "";

  return (
    <div style={{ position: "relative" }}>
      <input
        className={`${style.textInput}${
          showOverlay ? ` ${style.dateInputFilled}` : ""
        }`}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {showOverlay && (
        <span
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            fontSize: "14px",
            color: "var(--text-color-1)",
          }}
        >
          {formattedDate}
        </span>
      )}
    </div>
  );
};

/* ── 시스템 변수 ── */

const getSystemVariableValue = (varId: string): string => {
  const now = new Date();
  switch (varId) {
    case "_system_date":
      return now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    case "_system_time": {
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
    case "_system_day":
      return ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
    default:
      return "";
  }
};

/* ── 조건부 필드 평가 유틸 ── */

const evaluateCondition = (
  condition: { fieldId: string; operator: string; value: any },
  data: Record<string, any>
): boolean => {
  const fieldValue = condition.fieldId.startsWith("_system_")
    ? getSystemVariableValue(condition.fieldId)
    : data[condition.fieldId];
  switch (condition.operator) {
    case "equals":
      return String(fieldValue ?? "") === String(condition.value ?? "");
    case "notEquals":
      return String(fieldValue ?? "") !== String(condition.value ?? "");
    case "contains":
      return String(fieldValue ?? "").includes(String(condition.value ?? ""));
    case "before":
      return String(fieldValue ?? "") < String(condition.value ?? "");
    case "after":
      return String(fieldValue ?? "") > String(condition.value ?? "");
    case "isEmpty":
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "isNotEmpty":
      return !(
        fieldValue === undefined ||
        fieldValue === null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    default:
      return true;
  }
};

const isFieldVisible = (
  field: TAltFormField,
  data: Record<string, any>
): boolean => {
  const dc = field.displayCondition;
  if (!dc?.enabled || !dc.conditions.length) return true;

  if (dc.logic === "or") {
    return dc.conditions.some((c) => evaluateCondition(c, data));
  }
  return dc.conditions.every((c) => evaluateCondition(c, data));
};

/** 새/빈 응답의 docResponse 템플릿과 지정 기본 인원만 채운다 (기존 값은 유지). */
const pickCandidateIdsFromBoard = (board: TBoard) => {
  const boardAdmins = (
    board as {
      admins?: {
        users?: { user?: string; userId?: string; userName?: string }[];
      };
    }
  ).admins?.users;
  return {
    approvalCandidateIds: uniqueApprovalCandidates(
      board.writers?.users,
      boardAdmins
    )
      .map((u) => u.userId)
      .filter(Boolean),
    circulationCandidateIds: uniqueApprovalCandidates(
      board.members?.users,
      board.writers?.users,
      boardAdmins
    )
      .map((u) => u.userId)
      .filter(Boolean),
  };
};

const withFormFieldDefaults = (
  fields: TAltFormField[],
  existing: Record<string, any> = {},
  board: TBoard
) => {
  const next = { ...existing };
  for (const field of fields) {
    if (field.type !== "docResponse") continue;
    if (next[field._id] === undefined || next[field._id] === null) {
      next[field._id] = field.content ?? "";
    }
  }
  return seedComposePickDefaults(next, fields, pickCandidateIdsFromBoard(board));
};

const AltFormRenderer = ({
  board,
  formId,
  onBack,
  initialViewMode = "compose",
  initialReviewRowId,
  onViewModeChange,
}: Props) => {
  const { AltFormAPI, AltSheetRowAPI, ChatAPI, FileAPI, PostAPI } = useAPIv2();
  const { currentSchool, currentRegistration, currentUser, currentSeason } =
    useAuth();

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

  const [form, setForm] = useState<TAltForm | null>(null);
  const [myRows, setMyRows] = useState<TAltSheetRow[]>([]);
  const [myRow, setMyRow] = useState<TAltSheetRow | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [viewMode, setViewMode] = useState<TFormViewMode>("compose");
  const [editingSubmitted, setEditingSubmitted] = useState(false);
  const [composeDirty, setComposeDirty] = useState(false);
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reuseDroppedNotice, setReuseDroppedNotice] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [previewFile, setPreviewFile] = useState<TFormFileRef | null>(null);

  // counter 필드용 현재 카운트
  const [counterCounts, setCounterCounts] = useState<Record<string, number>>(
    {}
  );

  // file 필드용
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingFields, setUploadingFields] = useState<
    Record<string, boolean>
  >({});
  const [fileLinkFieldId, setFileLinkFieldId] = useState<string | null>(null);
  const [selectedOccurrenceKey, setSelectedOccurrenceKey] = useState("");

  // link 필드용 OG 메타데이터 로딩
  const [fetchingOg, setFetchingOg] = useState<Record<string, boolean>>({});
  const ogFetchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

  // userSelect / approval 용 사용자 검색
  const [userSearchQuery, setUserSearchQuery] = useState<
    Record<string, string>
  >({});
  const [userSearchResults, setUserSearchResults] = useState<
    Record<string, TChatUser[]>
  >({});

  // 사전등록 모드용 가용 조합
  const [availableCombinations, setAvailableCombinations] = useState<
    { values: Record<string, any>; availableCount: number }[]
  >([]);
  /** 재사용·수정 등 내부 전환 직후, URL initialViewMode가 따라올 때까지 덮어쓰지 않음 */
  const skipNextExternalViewMode = useRef(false);

  const applyFieldDefaults = (
    fields: TAltFormField[],
    existing: Record<string, any> = {}
  ) => {
    const { data: next, dropped } = withFormFieldDefaults(
      fields,
      existing,
      board
    );
    if (dropped.length) {
      setReuseDroppedNotice(formatReusedDroppedNotice(dropped));
    }
    return next;
  };

  useEffect(() => {
    Promise.all([
      AltFormAPI.RAltForm({ params: { _id: formId } }),
      AltSheetRowAPI.RAltSheetRowMy({ query: { form: formId } }),
    ])
      .then(([{ form: loadedForm }, { rows }]) => {
        setForm(loadedForm);
        const loadedRows = rows || [];
        setMyRows(loadedRows);
        const drafts = sortDraftRows(loadedRows);
        const submitted = sortSubmittedRows(loadedRows);
        const canReviewSubmitted =
          loadedForm.settings.showOwnResponse !== false &&
          submitted.length > 0;
        const startInReview =
          initialViewMode === "review" && canReviewSubmitted;
        const submittedIdx = initialReviewRowId
          ? Math.max(
              0,
              submitted.findIndex(
                (r) => String(r._id) === String(initialReviewRowId)
              )
            )
          : 0;
        const target = getRequiredResponseCount(loadedForm);
        const quotaReached =
          target != null && submitted.length >= target;
        const cannotWrite =
          (loadedForm.settings.allowMultipleResponses && quotaReached) ||
          (!loadedForm.settings.allowMultipleResponses &&
            submitted.length > 0);

        if (startInReview || (cannotWrite && canReviewSubmitted)) {
          const row = submitted[submittedIdx] || submitted[0];
          setReviewIndex(submittedIdx);
          setViewMode("review");
          setMyRow(null);
          setIsSubmitted(false);
          setData(applyFieldDefaults(loadedForm.fields, row?.data || {}));
        } else {
          const writeItems = buildInProgressDraftList(loadedRows);
          let writeIdx = 0;
          if (initialReviewRowId) {
            const di = drafts.findIndex(
              (r) => String(r._id) === String(initialReviewRowId)
            );
            if (di >= 0) writeIdx = di + 1;
          }
          const item = writeItems[writeIdx] || writeItems[0];
          setViewMode("compose");
          setReviewIndex(writeIdx);
          setIsSubmitted(false);
          if (item.kind === "local") {
            const local = currentUser?._id
              ? readFormResponseDraft(
                  formResponseDraftStorageKey(
                    currentUser._id,
                    loadedForm._id,
                    "new"
                  )
                )
              : null;
            setMyRow(null);
            setData(
              applyFieldDefaults(loadedForm.fields, local?.data || {})
            );
          } else {
            setMyRow(item.row);
            setData(
              applyFieldDefaults(loadedForm.fields, item.row.data || {})
            );
          }
        }

        // counter 필드 카운트 로드
        const counterFields = loadedForm.fields.filter(
          (f: TAltFormField) => f.type === "counter"
        );
        if (counterFields.length > 0) {
          AltSheetRowAPI.RAltSheetRowCount({
            query: { form: loadedForm._id },
          })
            .then(({ count }: { count: number }) => {
              const counts: Record<string, number> = {};
              for (const cf of counterFields) {
                counts[cf._id] = count;
              }
              setCounterCounts(counts);
            })
            .catch(() => {});
        }

        // 사전등록 가용 조합 로드
        const preRegFields = loadedForm.fields.filter(
          (f: TAltFormField) =>
            f.duplicateCheck?.enabled &&
            f.duplicateCheck.mode === "preRegistration"
        );
        if (preRegFields.length > 0) {
          AltSheetRowAPI.RAltSheetRowAvailableCombinations({
            query: { form: loadedForm._id },
          })
            .then(({ combinations }: any) => {
              setAvailableCombinations(combinations || []);
            })
            .catch(() => {});
        }

        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        onBack();
      });
  }, [formId]);

  // 사용자 검색 디바운스
  const searchUsers = useCallback(
    async (fieldId: string, query: string) => {
      if (!query.trim()) {
        setUserSearchResults((prev) => ({ ...prev, [fieldId]: [] }));
        return;
      }
      try {
        const { users } = await ChatAPI.RChatUsers({
          query: {
            q: query,
            sid: currentSchool?.school || undefined,
          },
        });
        setUserSearchResults((prev) => ({ ...prev, [fieldId]: users }));
      } catch {
        /* ignore */
      }
    },
    [currentSchool?.school]
  );

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    for (const [fieldId, query] of Object.entries(userSearchQuery)) {
      const timer = setTimeout(() => searchUsers(fieldId, query), 300);
      timers.push(timer);
    }
    return () => timers.forEach(clearTimeout);
  }, [userSearchQuery, searchUsers]);

  // 응답 화면: 문서(content) + 응답자 필드를 순서대로
  const respondentFields = useMemo(
    () =>
      form?.fields.filter(
        (f) =>
          isFieldVisible(f, data) &&
          (f.type === "content" || f.permission === "respondent")
      ) || [],
    [form, data]
  );

  const visibleOwnerFields = useMemo(
    () =>
      form?.fields.filter(
        (f) =>
          f.type !== "content" &&
          f.permission === "owner" &&
          (f.visibleToRespondent || form.settings.showOwnerFields) &&
          isFieldVisible(f, data)
      ) || [],
    [form, data]
  );

  const draftRows = useMemo(() => sortDraftRows(myRows), [myRows]);
  const submittedRows = useMemo(() => sortSubmittedRows(myRows), [myRows]);
  const hasLocalNew =
    !!currentUser?._id &&
    !!form &&
    hasLocalComposeDraft(currentUser._id, form._id);
  const inProgressItems = useMemo(
    () => buildInProgressDraftList(myRows),
    [myRows]
  );
  const isComposeMode = viewMode === "compose";
  const isReviewMode = viewMode === "review";
  const listRows = isReviewMode ? submittedRows : [];
  const activeInProgress = isComposeMode
    ? inProgressItems[reviewIndex] ?? inProgressItems[0] ?? null
    : null;
  const isLocalDraftItem = activeInProgress?.kind === "local";
  const isServerDraftSlot = activeInProgress?.kind === "row";
  const showLocalBanner = isComposeMode && isLocalDraftItem;
  const hasLocalBannerContent = hasLocalNew || composeDirty;
  const activeRow = isComposeMode
    ? isServerDraftSlot
      ? activeInProgress.row
      : myRow
    : listRows[reviewIndex] ?? null;
  const activeIsDraft = isDraftSheetRow(activeRow);

  const canShowSubmitted =
    form?.settings.showOwnResponse !== false && submittedRows.length > 0;

  const readLocalNewData = () => {
    if (!currentUser?._id || !form) return {};
    return (
      readFormResponseDraft(
        formResponseDraftStorageKey(currentUser._id, form._id, "new")
      )?.data || {}
    );
  };

  const openWriteSlot = (index: number) => {
    if (!form) return;
    const items = buildInProgressDraftList(myRows);
    const idx = Math.min(Math.max(0, index), items.length - 1);
    const item = items[idx] || { kind: "local" as const };
    skipNextExternalViewMode.current = true;
    setEditingSubmitted(false);
    setReviewIndex(idx);
    setIsSubmitted(false);
    setErrors({});
    setReuseDroppedNotice(null);
    setComposeDirty(false);
    if (item.kind === "local") {
      setMyRow(null);
      setData(applyFieldDefaults(form.fields, readLocalNewData()));
    } else {
      setMyRow(item.row);
      setData(applyFieldDefaults(form.fields, item.row.data || {}));
    }
    setViewMode("compose");
    onViewModeChange?.("compose");
  };

  const startCompose = () => openWriteSlot(0);

  const openReview = (index: number) => {
    if (!form || !canShowSubmitted || !submittedRows.length) return;
    const idx = Math.min(Math.max(0, index), submittedRows.length - 1);
    const row = submittedRows[idx];
    skipNextExternalViewMode.current = true;
    setEditingSubmitted(false);
    setReviewIndex(idx);
    setMyRow(null);
    setIsSubmitted(false);
    setErrors({});
    setReuseDroppedNotice(null);
    if (row) {
      setData(applyFieldDefaults(form.fields, row.data || {}));
    }
    setViewMode("review");
    onViewModeChange?.("review");
  };

  const switchViewMode = (mode: TFormViewMode) => {
    if (!form) return;
    if (mode === "compose" || mode === "drafts") {
      startCompose();
      return;
    }
    if (mode === viewMode) return;
    openReview(0);
  };

  useEffect(() => {
    if (!form) return;
    const { apply, nextSkip } = shouldApplyExternalViewMode({
      skipInternal: skipNextExternalViewMode.current,
      internalMode: viewMode,
      externalMode: initialViewMode,
    });
    skipNextExternalViewMode.current = nextSkip;
    if (apply) switchViewMode(initialViewMode);
    // 부모 URL/딥링크만 따라감. 재사용·수정 초안은 skip이 모드가 맞을 때까지 유지.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialViewMode, viewMode]);

  const goListRow = (nextIndex: number) => {
    if (isComposeMode) {
      if (nextIndex < 0 || nextIndex >= inProgressItems.length) return;
      openWriteSlot(nextIndex);
      return;
    }
    if (!form || nextIndex < 0 || nextIndex >= listRows.length) return;
    if (isReviewMode) {
      openReview(nextIndex);
      return;
    }
    setReviewIndex(nextIndex);
    const row = listRows[nextIndex];
    setErrors({});
    setData(applyFieldDefaults(form.fields, row.data || {}));
  };

  /** 양식에서 삭제된 필드의 제출값 (스키마에 없는 data 키) */
  const orphanResponses = useMemo(() => {
    const rowForOrphans =
      isReviewMode || isServerDraftSlot ? activeRow : myRow;
    if (
      (!isSubmitted && !isReviewMode && !isServerDraftSlot) ||
      !rowForOrphans?.data ||
      !form
    )
      return [];
    const fieldIds = new Set(form.fields.map((f) => f._id));
    return Object.entries(rowForOrphans.data).filter(([key, val]) => {
      if (!key || key.startsWith("_")) return false;
      if (fieldIds.has(key)) return false;
      if (val === undefined || val === null || val === "") return false;
      return true;
    });
  }, [isSubmitted, isReviewMode, isServerDraftSlot, activeRow, myRow, form]);

  const formatOrphanValue = (val: any): string => {
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) {
      return val
        .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
        .join(", ");
    }
    if (typeof val === "object") {
      if (val.url) return String(val.url);
      if (val.userName) return String(val.userName);
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const isClosed =
    form?.settings.closeAt && new Date(form.settings.closeAt) < new Date();
  const isNotOpen =
    form?.settings.openAt && new Date(form.settings.openAt) > new Date();

  const nowForSchedule = new Date();
  const weekdayOn = form ? isWeekdayScheduleEnabled(form) : false;
  const openOccurrences =
    form && weekdayOn ? getOpenOccurrences(form, nowForSchedule) : [];
  const outsideWeekdayPeriod = weekdayOn && openOccurrences.length === 0;
  const submittedThisOccurrence =
    weekdayOn &&
    !!form &&
    hasSubmittedCurrentOccurrence(form, submittedRows, nowForSchedule);
  const unsubmittedOpenOccurrences = form
    ? openOccurrences.filter(
        (occ) => !hasSubmittedOccurrence(form, submittedRows, occ)
      )
    : [];
  const unsubmittedOpenKeys = unsubmittedOpenOccurrences
    .map((occ) => occ.key)
    .join(",");

  useEffect(() => {
    if (!unsubmittedOpenKeys) {
      setSelectedOccurrenceKey("");
      return;
    }
    const keys = unsubmittedOpenKeys.split(",");
    setSelectedOccurrenceKey((prev) =>
      keys.includes(prev) ? prev : keys[0]
    );
  }, [unsubmittedOpenKeys]);

  const schoolRole =
    currentUser?.auth === "manager"
      ? "manager"
      : currentRegistration?.role || null;
  const myRole = getMyAltBoardRole(board, currentUser);
  const canRespondAsMember = !!(
    form && isFormRespondent(form, currentUser, myRole, schoolRole)
  );

  const canSubmit =
    canRespondAsMember &&
    !isClosed &&
    !isNotOpen &&
    !outsideWeekdayPeriod &&
    !submittedThisOccurrence;
  const windowOpen =
    !isClosed && !isNotOpen && !outsideWeekdayPeriod;
  const requiredTarget = getRequiredResponseCount(form);
  const multipleQuotaReached =
    requiredTarget != null && submittedRows.length >= requiredTarget;
  const canShowWriteTab =
    !!form &&
    !multipleQuotaReached &&
    (!!form.settings.allowMultipleResponses || submittedRows.length === 0);
  const canComposeMultiple =
    !!form?.settings.allowMultipleResponses &&
    canSubmit &&
    !multipleQuotaReached;
  const editingDraftRow = !!(myRow && isDraftSheetRow(myRow));
  const canShowSaveDraft =
    !isSubmitted &&
    canSubmit &&
    !form?.settings.directInputMode &&
    (isServerDraftSlot ||
      editingDraftRow ||
      canCreateAdditionalDraft(
        form,
        submittedRows.length,
        draftRows.length
      ));
  const canResubmit =
    isComposeMode &&
    !!form?.settings.allowResubmit &&
    isSubmitted &&
    !!myRow &&
    !editingDraftRow &&
    windowOpen;
  const submitLabel = (() => {
    const base = isSubmitted ? "수정 제출" : "제출";
    if (requiredTarget == null || !canComposeMultiple) return base;
    return `${base} (${submittedRows.length}/${requiredTarget})`;
  })();
  const canShowSubmit =
    (!isSubmitted &&
      canSubmit &&
      (isServerDraftSlot ||
        !form?.settings.allowMultipleResponses ||
        canComposeMultiple)) ||
    (isSubmitted && (canResubmit || editingSubmitted));
  const actionsInBanner = showLocalBanner || isServerDraftSlot;
  const canEditReviewRow =
    isReviewMode &&
    !editingSubmitted &&
    windowOpen &&
    submittedRows.length > 0 &&
    !!form?.settings.allowResubmit;

  const reuseCurrentResponse = () => {
    if (!form || !isReviewMode || !canComposeMultiple) return;
    const row = submittedRows[reviewIndex];
    if (!row) return;
    const copied = copyRowDataForReuse(row.data, form.fields);
    const { data: filtered, dropped } = filterReusedPickPeople(
      copied,
      form.fields,
      pickCandidateIdsFromBoard(board)
    );
    skipNextExternalViewMode.current = true;
    setEditingSubmitted(false);
    setReviewIndex(0);
    setData(applyFieldDefaults(form.fields, filtered));
    setMyRow(null);
    setIsSubmitted(false);
    setComposeDirty(true);
    setErrors({});
    setReuseDroppedNotice(formatReusedDroppedNotice(dropped));
    setViewMode("compose");
    onViewModeChange?.("compose");
  };

  const editCurrentResponse = () => {
    if (!form || !isReviewMode) return;
    const row = submittedRows[reviewIndex];
    if (!row || !form.settings.allowResubmit) return;
    skipNextExternalViewMode.current = true;
    setReuseDroppedNotice(null);
    setEditingSubmitted(true);
    setMyRow(row);
    setData(
      applyFieldDefaults(
        form.fields,
        mergeRowDataForEdit(row.data, data)
      )
    );
    setIsSubmitted(true);
    setErrors({});
    setViewMode("review");
    onViewModeChange?.("review");
  };

  const localDraftKey =
    currentUser?._id &&
    form &&
    (isComposeMode || editingSubmitted)
      ? formResponseDraftStorageKey(
          currentUser._id,
          form._id,
          myRow?._id || "new"
        )
      : null;
  const { lastSavedAt } = useFormResponseDraft({
    enabled:
      ((isLocalDraftItem && composeDirty) ||
        isServerDraftSlot ||
        editingSubmitted) &&
      !isLoading &&
      !!form &&
      !isSubmitting &&
      !isSavingDraft &&
      !(isComposeMode && isSubmitted && !canResubmit),
    storageKey: localDraftKey,
    data,
  });

  const reuseNoticeFieldId = useMemo(() => {
    if (!reuseDroppedNotice || !form) return null;
    return (
      form.fields.find(
        (f) => f.type === "approval" || f.type === "circulation"
      )?._id || null
    );
  }, [reuseDroppedNotice, form]);

  const hasSubmittedViewRow = isReviewMode
    ? !!activeRow && !activeIsDraft
    : isComposeMode && isSubmitted;

  // 퀴즈 결과 가시성
  const quizScoreVisible = useMemo(() => {
    if (!form?.settings.quizMode) return false;
    if (!hasSubmittedViewRow) return false;
    const reveal = form.settings.quizSettings?.scoreReveal;
    if (reveal === "immediately") return true;
    if (reveal === "afterDeadline") return !!isClosed;
    return false;
  }, [form, hasSubmittedViewRow, isClosed]);

  const quizAnswerVisible = useMemo(() => {
    if (!form?.settings.quizMode) return false;
    if (!hasSubmittedViewRow) return false;
    const reveal = form.settings.quizSettings?.answerReveal;
    if (reveal === "immediately") return true;
    if (reveal === "afterDeadline") return !!isClosed;
    return false;
  }, [form, hasSubmittedViewRow, isClosed]);

  const assessmentFinalized = useMemo(() => {
    if (!form?.settings.assessmentMode) return false;
    if (!hasSubmittedViewRow || !activeRow) return false;
    return activeRow.data?._assessment?.final?.status === "finalized";
  }, [form, hasSubmittedViewRow, activeRow]);

  const assessmentPending = useMemo(() => {
    if (!form?.settings.assessmentMode) return false;
    if (!hasSubmittedViewRow || !activeRow) return false;
    return activeRow.data?._assessment?.final?.status !== "finalized";
  }, [form, hasSubmittedViewRow, activeRow]);

  const setValue = (fieldId: string, value: any) => {
    if (isComposeMode) setComposeDirty(true);
    setData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const alterUserCandidates = useMemo(() => {
    const map = new Map<
      string,
      { user: string; userId: string; userName: string }
    >();
    for (const u of [
      ...(board.members?.users || []),
      ...(board.writers?.users || []),
    ]) {
      if (!u?.userId) continue;
      map.set(String(u.userId), {
        user: String(u.user),
        userId: u.userId,
        userName: u.userName || u.userId,
      });
    }
    return Array.from(map.values());
  }, [board.members?.users, board.writers?.users]);

  const alterEnabled =
    !isLoading &&
    !!form &&
    (isComposeMode || editingSubmitted) &&
    canSubmit &&
    (!isSubmitted || canResubmit || canComposeMultiple || isServerDraftSlot);

  useRegisterAlterFormResponse({
    enabled: alterEnabled,
    label: form
      ? `${board.name || ""} · ${form.title}`.trim()
      : board.name || "양식 응답",
    boardId: board._id,
    boardName: board.name,
    formId: form?._id || formId,
    formTitle: form?.title,
    fields: respondentFields,
    data,
    setValue,
    userCandidates: alterUserCandidates,
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of form?.fields || []) {
      if (field.type === "content") continue;
      if (field.permission !== "respondent") continue;
      if (!isFieldVisible(field, data)) continue;

      const value = data[field._id];

      if (field.type === "docResponse") {
        const template = (field.content ?? "").trim();
        const answer = String(value ?? field.content ?? "").trim();
        if (field.required && !answer) {
          newErrors[field._id] = "필수 항목입니다.";
          continue;
        }
        if (field.required && template && answer === template) {
          newErrors[field._id] = "템플릿을 수정한 뒤 제출해 주세요.";
          continue;
        }
      } else if (field.type === "aiChat") {
        if (field.required && !isAiChatRequiredMet(value)) {
          newErrors[field._id] = "AI 챗봇과 한 번 이상 대화해 주세요.";
        }
        continue;
      } else if (field.type === "approval") {
        if (field.required) {
          const msg = getRequiredApprovalError(field, value);
          if (msg) newErrors[field._id] = msg;
        }
        continue;
      } else if (field.type === "circulation") {
        const cfg = getCirculationConfig(field);
        if (cfg.mode === "fixed") continue;
        if (field.required) {
          const list = Array.isArray(value) ? value : [];
          if (!list.some((u: { userId?: string }) => u?.userId)) {
            newErrors[field._id] = "회람자를 한 명 이상 선택해주세요.";
          }
        }
        continue;
      } else if (field.required) {
        if (field.type === "file") {
          const hasAttachment =
            Array.isArray(value) &&
            value.some(
              (item) => isFileAnswerFile(item) || isFileAnswerLink(item)
            );
          if (!hasAttachment) {
            newErrors[field._id] = "파일 또는 링크를 첨부해주세요.";
            continue;
          }
        } else if (field.type === "link") {
          if (!value || !value.url || !value.url.trim()) {
            newErrors[field._id] = "링크를 입력해주세요.";
            continue;
          }
        } else if (Array.isArray(value) && value.length === 0) {
          newErrors[field._id] = "필수 항목입니다.";
          continue;
        } else if (value === undefined || value === null || value === "") {
          newErrors[field._id] = "필수 항목입니다.";
          continue;
        }
      }
      if (
        field.type === "userSelect" &&
        field.required &&
        !data[field._id]?.userId
      ) {
        newErrors[field._id] = "사용자를 선택해주세요.";
      }
      // 날짜 필드 제한 검증
      if (field.type === "date" && value) {
        const v = field.validation;
        if (v?.minDate && value < v.minDate) {
          newErrors[field._id] = `${v.minDate} 이후 날짜를 선택해주세요.`;
        } else if (v?.maxDate && value > v.maxDate) {
          newErrors[field._id] = `${v.maxDate} 이전 날짜를 선택해주세요.`;
        } else if (v?.allowedDays && v.allowedDays.length < 7) {
          const day = new Date(value + "T00:00:00").getDay();
          if (!v.allowedDays.includes(day)) {
            newErrors[field._id] = "해당 요일은 선택할 수 없습니다.";
          }
        }
        // 시간 윈도우 검증
        if (v?.availableFrom && v?.availableUntil) {
          const now = new Date();
          const nowMs = now.getTime();
          const [fH, fM] = v.availableFrom.split(":").map(Number);
          const [uH, uM] = v.availableUntil.split(":").map(Number);
          const fDays: number = v.availableFromDays ?? 1;
          const uDays: number = v.availableUntilDays ?? 0;

          const candidate = new Date(value + "T00:00:00");
          const winStart = new Date(candidate);
          winStart.setDate(winStart.getDate() - fDays);
          winStart.setHours(fH, fM, 0, 0);
          const winEnd = new Date(candidate);
          winEnd.setDate(winEnd.getDate() + uDays);
          winEnd.setHours(uH, uM, 0, 0);

          if (nowMs < winStart.getTime() || nowMs > winEnd.getTime()) {
            newErrors[field._id] = "현재 시간에 선택할 수 없는 날짜입니다.";
          }
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!form) return;
    const targetRow =
      isComposeMode || editingSubmitted ? myRow : activeRow;
    if (isServerDraftSlot && targetRow) {
      if (
        !canSubmitReviewDraft(targetRow, {
          canSubmit,
          allowMultipleResponses: !!form.settings.allowMultipleResponses,
          quotaReached: multipleQuotaReached,
        })
      ) {
        return;
      }
    } else if (isComposeMode && !targetRow) {
      if (
        !canSubmit ||
        (form.settings.allowMultipleResponses && multipleQuotaReached)
      ) {
        return;
      }
    }
    if (!validate()) {
      if (isServerDraftSlot || editingSubmitted) {
        window.alert("필수 항목을 확인한 뒤 제출해 주세요.");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = applyFieldDefaults(form.fields, data);
      const editingDraft = !!(targetRow && isDraftSheetRow(targetRow));
      const editingSubmitted = !!(
        targetRow &&
        !isDraftSheetRow(targetRow) &&
        form.settings.allowResubmit
      );
      const editingExisting = editingDraft || editingSubmitted;
      const { row } = await AltSheetRowAPI.CAltSheetRow({
        data: {
          form: form._id,
          data: submitData,
          ...(editingExisting && targetRow ? { row: targetRow._id } : {}),
          ...(!editingExisting && selectedOccurrenceKey
            ? { weekdayOccurrenceKey: selectedOccurrenceKey }
            : {}),
        },
      });
      if (currentUser?._id) {
        clearFormResponseDraft(
          formResponseDraftStorageKey(currentUser._id, form._id, "new")
        );
        if (targetRow?._id) {
          clearFormResponseDraft(
            formResponseDraftStorageKey(currentUser._id, form._id, targetRow._id)
          );
        }
        clearFormResponseDraft(
          formResponseDraftStorageKey(currentUser._id, form._id, row._id)
        );
      }

      if (editingExisting) {
        const merged = myRows.some((r) => r._id === row._id)
          ? myRows.map((r) => (r._id === row._id ? row : r))
          : [row, ...myRows];
        setMyRows(merged);
        setData(applyFieldDefaults(form.fields, row.data || submitData));
        const nextSubmitted = sortSubmittedRows(merged);
        const idx = nextSubmitted.findIndex((r) => r._id === row._id);
        setReviewIndex(idx >= 0 ? idx : 0);
        setEditingSubmitted(false);
        setMyRow(null);
        setIsSubmitted(false);
        skipNextExternalViewMode.current = true;
        setViewMode("review");
        onViewModeChange?.("review");
        alert(
          editingDraft
            ? form.settings.assessmentMode
              ? "과제가 제출되었습니다."
              : "응답이 제출되었습니다."
            : form.settings.assessmentMode
              ? "과제가 수정되었습니다."
              : "응답이 수정되었습니다."
        );
      } else if (form.settings.allowMultipleResponses) {
        alert(
          form.settings.assessmentMode
            ? "과제가 제출되었습니다."
            : "응답이 제출되었습니다."
        );
        const nextRows = [row, ...myRows];
        setMyRows(nextRows);
        setMyRow(null);
        setEditingSubmitted(false);
        const target = getRequiredResponseCount(form);
        const submittedCount = sortSubmittedRows(nextRows).length;
        if (target != null && submittedCount >= target) {
          setReviewIndex(0);
          setData(applyFieldDefaults(form.fields, row.data || {}));
          skipNextExternalViewMode.current = true;
          setViewMode("review");
          onViewModeChange?.("review");
          setIsSubmitted(false);
        } else {
          setReviewIndex(0);
          setComposeDirty(false);
          setData(applyFieldDefaults(form.fields));
          setIsSubmitted(false);
        }
      } else {
        setMyRows([row]);
        setMyRow(null);
        setEditingSubmitted(false);
        setIsSubmitted(false);
        setReviewIndex(0);
        setData(applyFieldDefaults(form.fields, row.data || submitData));
        skipNextExternalViewMode.current = true;
        setViewMode("review");
        onViewModeChange?.("review");
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!form) return;
    setIsSavingDraft(true);
    try {
      const saveData = applyFieldDefaults(form.fields, data);
      const { row } = await AltSheetRowAPI.CAltSheetRowDraft({
        data: {
          form: form._id,
          data: saveData,
          ...(myRow && isDraftSheetRow(myRow) ? { row: myRow._id } : {}),
          ...(!(myRow && isDraftSheetRow(myRow)) && selectedOccurrenceKey
            ? { weekdayOccurrenceKey: selectedOccurrenceKey }
            : {}),
        },
      });
      if (currentUser?._id) {
        clearFormResponseDraft(
          formResponseDraftStorageKey(currentUser._id, form._id, "new")
        );
        clearFormResponseDraft(
          formResponseDraftStorageKey(currentUser._id, form._id, row._id)
        );
      }
      const merged = myRows.some((r) => r._id === row._id)
        ? myRows.map((r) => (r._id === row._id ? row : r))
        : [row, ...myRows];
      setMyRows(merged);
      startCompose();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleWithdraw = async () => {
    if (!form) return;
    if (isComposeMode && isLocalDraftItem) {
      if (
        !window.confirm(
          "브라우저에 저장된 내용을 지우고 새로 작성할까요?"
        )
      )
        return;
      if (currentUser?._id) {
        clearFormResponseDraft(
          formResponseDraftStorageKey(currentUser._id, form._id, "new")
        );
      }
      setComposeDirty(false);
      setMyRow(null);
      setReviewIndex(0);
      setData(applyFieldDefaults(form.fields));
      return;
    }
    const row = isServerDraftSlot
      ? activeInProgress.row
      : isReviewMode
        ? submittedRows[reviewIndex] || myRow
        : myRow;
    if (!row) return;
    const isDraft = isDraftSheetRow(row);
    if (!isDraft && !form.settings.allowResubmit) return;
    if (!window.confirm(isDraft ? "이 저장본을 삭제하시겠습니까?" : "이 응답을 삭제하시겠습니까?"))
      return;

    try {
      await AltSheetRowAPI.DAltSheetRow({ params: { _id: row._id } });
      const nextRows = myRows.filter((r) => r._id !== row._id);
      setMyRows(nextRows);
      setMyRow(null);
      setIsSubmitted(false);
      setEditingSubmitted(false);
      const nextSubmitted = sortSubmittedRows(nextRows);
      if (isDraft) {
        setReviewIndex(0);
        setData(applyFieldDefaults(form.fields, readLocalNewData()));
        skipNextExternalViewMode.current = true;
        setViewMode("compose");
        onViewModeChange?.("compose");
      } else if (!isDraft && nextSubmitted.length > 0) {
        const nextIdx = Math.min(reviewIndex, nextSubmitted.length - 1);
        setReviewIndex(nextIdx);
        setData(
          applyFieldDefaults(form.fields, nextSubmitted[nextIdx].data || {})
        );
        skipNextExternalViewMode.current = true;
        setViewMode("review");
        onViewModeChange?.("review");
      } else {
        setReviewIndex(0);
        setData(applyFieldDefaults(form.fields));
        skipNextExternalViewMode.current = true;
        setViewMode("compose");
        onViewModeChange?.("compose");
      }
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  /* ── 필드별 퀴즈 결과 마크 ── */
  const getQuizMark = (field: TAltFormField) => {
    if (!quizAnswerVisible || !activeRow) return null;
    const fieldResults = activeRow.data?._quiz_fieldResults;
    if (!fieldResults) return null;
    const isCorrect = fieldResults[field._id];
    if (isCorrect === undefined) return null;
    return isCorrect;
  };

  /* ── 사전등록 모드: 특정 필드의 가용 옵션 ── */
  const getPreRegOptions = (field: TAltFormField): string[] => {
    if (
      !field.duplicateCheck?.enabled ||
      field.duplicateCheck.mode !== "preRegistration"
    )
      return field.options || [];

    const available = new Set<string>();
    for (const combo of availableCombinations) {
      if (combo.availableCount > 0 && combo.values[field._id] !== undefined) {
        available.add(String(combo.values[field._id]));
      }
    }
    return Array.from(available);
  };

  /* ── 필드 렌더 ── */
  const renderField = (field: TAltFormField, disabled: boolean) => {
    const value = data[field._id] ?? "";

    switch (field.type) {
      case "text":
        return (
          <input
            className={style.textInput}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            placeholder="답변을 입력하세요"
            disabled={disabled}
          />
        );

      case "textarea":
        return (
          <textarea
            className={style.textArea}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            placeholder="답변을 입력하세요"
            disabled={disabled}
          />
        );

      case "aiChat":
        return (
          <FormAiChatField
            formId={form?._id || formId}
            field={field}
            value={data[field._id]}
            seasonId={currentSeason?._id}
            rowId={myRow?._id}
            disabled={disabled}
            onChange={(summary) => setValue(field._id, summary)}
            onRowReady={(row) => {
              setMyRow(row);
              setMyRows((prev) => {
                const merged = prev.some((r) => r._id === row._id)
                  ? prev.map((r) => (r._id === row._id ? row : r))
                  : [row, ...prev];
                return sortMyRowsForReview(merged);
              });
              const next = row.data?.[field._id];
              if (next) setValue(field._id, next);
            }}
            onPreview={setPreviewFile}
          />
        );

      case "docResponse": {
        const docValue = data[field._id] ?? field.content ?? "";
        const resources = (
          <FieldDocResources
            attachments={field.attachments}
            links={field.links}
            onPreview={setPreviewFile}
          />
        );
        if (disabled) {
          return (
            <div className={style.contentFieldBody}>
              <MarkdownWysiwygView content={docValue} />
              {resources}
            </div>
          );
        }
        return (
          <div className={style.docResponseField}>
            <MarkdownEditor
              value={docValue}
              onChange={(md) => setValue(field._id, md)}
              placeholder="템플릿을 편집하여 응답을 작성하세요."
              minHeight="220px"
              onImageUpload={handleEditorImageUpload}
            />
            {resources}
          </div>
        );
      }

      case "number":
        return (
          <input
            className={style.textInput}
            type="number"
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          />
        );

      case "date": {
        const v = field.validation || {};
        const allowedDays: number[] | undefined = v.allowedDays;
        const availableFrom: string = v.availableFrom || "";
        const availableUntil: string = v.availableUntil || "";
        const fromDays: number = v.availableFromDays ?? 1;
        const untilDays: number = v.availableUntilDays ?? 0;
        const hasTimeWindow = !!(availableFrom && availableUntil);

        // 시간 윈도우: 현재 시각으로 선택 가능한 날짜 목록 계산
        const getSelectableDates = (): string[] => {
          if (!hasTimeWindow) return [];
          const now = new Date();
          const nowMs = now.getTime();
          const toDateStr = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${dd}`;
          };
          const [fH, fM] = availableFrom.split(":").map(Number);
          const [uH, uM] = availableUntil.split(":").map(Number);
          const results: string[] = [];

          // 현재 시간 기준 ±30일 범위 탐색 (충분한 범위)
          for (let offset = -30; offset <= 30; offset++) {
            const candidate = new Date(now);
            candidate.setDate(candidate.getDate() + offset);
            candidate.setHours(0, 0, 0, 0);
            const dateStr = toDateStr(candidate);

            // minDate/maxDate 범위 확인
            if (v.minDate && dateStr < v.minDate) continue;
            if (v.maxDate && dateStr > v.maxDate) continue;

            // 윈도우 시작: 대상일 - fromDays 일 at fromTime
            const winStart = new Date(candidate);
            winStart.setDate(winStart.getDate() - fromDays);
            winStart.setHours(fH, fM, 0, 0);

            // 윈도우 종료: 대상일 + untilDays 일 at untilTime
            const winEnd = new Date(candidate);
            winEnd.setDate(winEnd.getDate() + untilDays);
            winEnd.setHours(uH, uM, 0, 0);

            if (nowMs >= winStart.getTime() && nowMs <= winEnd.getTime()) {
              results.push(dateStr);
            }
          }
          return results;
        };

        const selectableDates = hasTimeWindow ? getSelectableDates() : [];
        const selectableSet = new Set(selectableDates);

        // min/max 적용
        let effectiveMin = v.minDate || "";
        let effectiveMax = v.maxDate || "";
        if (hasTimeWindow && selectableDates.length > 0) {
          effectiveMin = selectableDates[0];
          effectiveMax = selectableDates[selectableDates.length - 1];
        }

        const isDateDisabled = hasTimeWindow && selectableDates.length === 0;

        const handleDateChange = (dateStr: string) => {
          if (dateStr && allowedDays && allowedDays.length < 7) {
            const day = new Date(dateStr + "T00:00:00").getDay();
            if (!allowedDays.includes(day)) {
              setErrors((prev) => ({
                ...prev,
                [field._id]: "해당 요일은 선택할 수 없습니다.",
              }));
              setValue(field._id, "");
              return;
            }
          }
          if (hasTimeWindow && !selectableSet.has(dateStr)) {
            setErrors((prev) => ({
              ...prev,
              [field._id]: "현재 시간에 선택할 수 없는 날짜입니다.",
            }));
            setValue(field._id, "");
            return;
          }
          setErrors((prev) => {
            const next = { ...prev };
            delete next[field._id];
            return next;
          });
          setValue(field._id, dateStr);
        };

        return (
          <div>
            <DateInputWithOverlay
              value={typeof value === "string" ? value : ""}
              min={effectiveMin}
              max={effectiveMax}
              disabled={disabled || isDateDisabled}
              onChange={handleDateChange}
            />
            {allowedDays && allowedDays.length < 7 && (
              <div style={{ fontSize: "11px", color: "var(--text-color-2)", marginTop: "2px" }}>
                {["일", "월", "화", "수", "목", "금", "토"]
                  .filter((_, i) => allowedDays.includes(i))
                  .join(", ")}
                요일만 선택 가능
              </div>
            )}
            {hasTimeWindow && (
              <div style={{ fontSize: "11px", color: isDateDisabled ? "var(--status-error)" : "var(--text-color-2)", marginTop: "2px" }}>
                {isDateDisabled
                  ? "현재 선택 가능한 날짜가 없습니다."
                  : `선택 가능: ${selectableDates.join(", ")}`}
              </div>
            )}
          </div>
        );
      }

      case "multiDate": {
        const mv = field.validation || {};
        const mAllowedDays: number[] | undefined = mv.allowedDays;
        const mAvailFrom: string = mv.availableFrom || "";
        const mAvailUntil: string = mv.availableUntil || "";
        const mFromDays: number = mv.availableFromDays ?? 1;
        const mUntilDays: number = mv.availableUntilDays ?? 0;
        const mHasWindow = !!(mAvailFrom && mAvailUntil);

        const selected: string[] = Array.isArray(value) ? value : [];

        // 시간 윈도우 선택 가능 날짜 계산 (date case와 동일 로직)
        const mSelectableSet = new Set<string>();
        if (mHasWindow) {
          const now = new Date();
          const nowMs = now.getTime();
          const [fH, fM] = mAvailFrom.split(":").map(Number);
          const [uH, uM] = mAvailUntil.split(":").map(Number);
          for (let off = -30; off <= 30; off++) {
            const c = new Date(now);
            c.setDate(c.getDate() + off);
            c.setHours(0, 0, 0, 0);
            const y = c.getFullYear();
            const mo = String(c.getMonth() + 1).padStart(2, "0");
            const dd = String(c.getDate()).padStart(2, "0");
            const ds = `${y}-${mo}-${dd}`;
            if (mv.minDate && ds < mv.minDate) continue;
            if (mv.maxDate && ds > mv.maxDate) continue;
            const ws = new Date(c);
            ws.setDate(ws.getDate() - mFromDays);
            ws.setHours(fH, fM, 0, 0);
            const we = new Date(c);
            we.setDate(we.getDate() + mUntilDays);
            we.setHours(uH, uM, 0, 0);
            if (nowMs >= ws.getTime() && nowMs <= we.getTime()) mSelectableSet.add(ds);
          }
        }

        const handleAddDate = (dateStr: string) => {
          if (!dateStr || selected.includes(dateStr)) return;
          if (mAllowedDays && mAllowedDays.length < 7) {
            const day = new Date(dateStr + "T00:00:00").getDay();
            if (!mAllowedDays.includes(day)) {
              setErrors((p) => ({ ...p, [field._id]: "해당 요일은 선택할 수 없습니다." }));
              return;
            }
          }
          if (mHasWindow && !mSelectableSet.has(dateStr)) {
            setErrors((p) => ({ ...p, [field._id]: "현재 시간에 선택할 수 없는 날짜입니다." }));
            return;
          }
          setErrors((p) => { const n = { ...p }; delete n[field._id]; return n; });
          setValue(field._id, [...selected, dateStr].sort());
        };

        const handleRemoveDate = (dateStr: string) => {
          setValue(field._id, selected.filter((d) => d !== dateStr));
        };

        const mSelectableDates = mHasWindow ? Array.from(mSelectableSet).sort() : [];

        // 요일별 일괄 선택용 날짜 풀 계산
        const dayPool: string[] = (() => {
          if (mHasWindow) return mSelectableDates;
          if (mv.minDate && mv.maxDate) {
            const dates: string[] = [];
            const cur = new Date(mv.minDate + "T00:00:00");
            const end = new Date(mv.maxDate + "T00:00:00");
            while (cur <= end) {
              const y = cur.getFullYear();
              const mo = String(cur.getMonth() + 1).padStart(2, "0");
              const dd = String(cur.getDate()).padStart(2, "0");
              dates.push(`${y}-${mo}-${dd}`);
              cur.setDate(cur.getDate() + 1);
            }
            return dates;
          }
          return [];
        })();

        const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

        const getDatesForDay = (dayIndex: number) =>
          dayPool.filter((d) => new Date(d + "T00:00:00").getDay() === dayIndex);

        const handleToggleDay = (dayIndex: number) => {
          const datesForDay = getDatesForDay(dayIndex);
          if (datesForDay.length === 0) return;
          const allSelected = datesForDay.every((d) => selected.includes(d));
          if (allSelected) {
            const removeSet = new Set(datesForDay);
            setValue(field._id, selected.filter((d) => !removeSet.has(d)));
          } else {
            const merged = Array.from(new Set([...selected, ...datesForDay])).sort();
            setValue(field._id, merged);
          }
        };

        return (
          <div>
            {!disabled && dayPool.length > 0 && (
              <div className={style.dayOfWeekBar}>
                {DAY_LABELS.map((label, i) => {
                  const datesForDay = getDatesForDay(i);
                  const isDayDisabled = datesForDay.length === 0 ||
                    (mAllowedDays && mAllowedDays.length < 7 && !mAllowedDays.includes(i));
                  const allSelected = datesForDay.length > 0 &&
                    datesForDay.every((d) => selected.includes(d));
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`${style.dayOfWeekBtn} ${allSelected ? style.dayOfWeekBtnActive : ""}`}
                      disabled={!!isDayDisabled}
                      onClick={() => handleToggleDay(i)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {selected.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                {selected.map((d) => (
                  <span
                    key={d}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 8px", fontSize: "12px", borderRadius: "12px",
                      background: "var(--background-color-2)", border: "var(--border-default)",
                    }}
                  >
                    {new Date(d + "T00:00:00").toLocaleDateString("ko-KR", {
                      year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
                    })}
                    {!disabled && (
                      <button
                        type="button" className={style.removeBtn}
                        style={{ fontSize: "12px", padding: 0, lineHeight: 1 }}
                        onClick={() => handleRemoveDate(d)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {!disabled && (
              <input
                className={style.textInput}
                type="date"
                min={mv.minDate || (mHasWindow && mSelectableDates.length > 0 ? mSelectableDates[0] : "")}
                max={mv.maxDate || (mHasWindow && mSelectableDates.length > 0 ? mSelectableDates[mSelectableDates.length - 1] : "")}
                disabled={mHasWindow && mSelectableDates.length === 0}
                onChange={(e) => {
                  handleAddDate(e.target.value);
                  e.target.value = "";
                }}
              />
            )}
            {mAllowedDays && mAllowedDays.length < 7 && (
              <div style={{ fontSize: "11px", color: "var(--text-color-2)", marginTop: "2px" }}>
                {["일", "월", "화", "수", "목", "금", "토"].filter((_, i) => mAllowedDays.includes(i)).join(", ")}
                요일만 선택 가능
              </div>
            )}
            {mHasWindow && (
              <div style={{ fontSize: "11px", color: mSelectableDates.length === 0 ? "var(--status-error)" : "var(--text-color-2)", marginTop: "2px" }}>
                {mSelectableDates.length === 0
                  ? "현재 선택 가능한 날짜가 없습니다."
                  : `선택 가능: ${mSelectableDates.join(", ")}`}
              </div>
            )}
          </div>
        );
      }

      case "time":
        return (
          <TimePicker
            value={typeof value === "string" ? value : ""}
            onChange={(next) => setValue(field._id, next)}
            disabled={disabled}
          />
        );

      case "select": {
        const isPreReg =
          field.duplicateCheck?.enabled &&
          field.duplicateCheck.mode === "preRegistration";
        const options = isPreReg
          ? getPreRegOptions(field)
          : field.options || [];

        return (
          <select
            className={style.selectInput}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          >
            <option value="">선택하세요</option>
            {options.map((opt, i) => {
              const isUnavailable =
                isPreReg &&
                !availableCombinations.some(
                  (c) =>
                    c.values[field._id] === opt && c.availableCount > 0
                );
              return (
                <option
                  key={i}
                  value={opt}
                  disabled={isUnavailable}
                >
                  {opt}
                  {isUnavailable ? " (마감)" : ""}
                </option>
              );
            })}
          </select>
        );
      }

      case "radio": {
        const isPreReg =
          field.duplicateCheck?.enabled &&
          field.duplicateCheck.mode === "preRegistration";
        const options = isPreReg
          ? getPreRegOptions(field)
          : field.options || [];

        return (
          <div>
            {options.map((opt, i) => {
              const isUnavailable =
                isPreReg &&
                !availableCombinations.some(
                  (c) =>
                    c.values[field._id] === opt && c.availableCount > 0
                );
              return (
                <label
                  key={i}
                  className={style.choiceOption}
                  style={isUnavailable ? { opacity: 0.5 } : undefined}
                >
                  <input
                    type="radio"
                    name={`field-${field._id}`}
                    value={opt}
                    checked={value === opt}
                    onChange={() => setValue(field._id, opt)}
                    disabled={disabled || isUnavailable}
                  />
                  {opt}
                  {isUnavailable && (
                    <span className={style.closedTag}>(마감)</span>
                  )}
                </label>
              );
            })}
          </div>
        );
      }

      case "checkbox":
        return (
          <label className={style.choiceOption}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setValue(field._id, e.target.checked)}
              disabled={disabled}
            />
            {field.label}
          </label>
        );

      case "multiSelect": {
        const selected: string[] = Array.isArray(value) ? value : [];
        return (
          <MultiSelectField
            fieldId={field._id}
            options={field.options || []}
            selected={selected}
            disabled={disabled}
            onChange={(next) => setValue(field._id, next)}
          />
        );
      }

      case "rating": {
        const maxStars = field.validation?.maxStars || 5;
        const currentRating = Number(value) || 0;
        return (
          <div className={style.ratingContainer}>
            {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                type="button"
                className={`${style.ratingStar} ${
                  star <= currentRating ? style.ratingStarActive : ""
                }`}
                onClick={() => !disabled && setValue(field._id, star)}
                disabled={disabled}
                title={`${star}점`}
              >
                ★
              </button>
            ))}
            {currentRating > 0 && (
              <span className={style.ratingValue}>{currentRating}점</span>
            )}
          </div>
        );
      }

      case "scale": {
        const min = field.validation?.min ?? 1;
        const max = field.validation?.max ?? 5;
        const minLabel = field.validation?.minLabel || "";
        const maxLabel = field.validation?.maxLabel || "";
        const currentVal = value !== "" ? Number(value) : "";

        return (
          <div className={style.scaleContainer}>
            <div className={style.scaleLabels}>
              {minLabel && (
                <span className={style.scaleMinLabel}>{minLabel}</span>
              )}
              <div className={style.scaleOptions}>
                {Array.from(
                  { length: max - min + 1 },
                  (_, i) => min + i
                ).map((n) => (
                  <label key={n} className={style.scaleOption}>
                    <input
                      type="radio"
                      name={`scale-${field._id}`}
                      value={n}
                      checked={currentVal === n}
                      onChange={() => setValue(field._id, n)}
                      disabled={disabled}
                    />
                    <span
                      className={`${style.scaleNum} ${
                        currentVal === n ? style.scaleNumActive : ""
                      }`}
                    >
                      {n}
                    </span>
                  </label>
                ))}
              </div>
              {maxLabel && (
                <span className={style.scaleMaxLabel}>{maxLabel}</span>
              )}
            </div>
          </div>
        );
      }

      case "counter": {
        const maxCount = field.validation?.maxCount || 0;
        const currentCount = counterCounts[field._id] || 0;
        const isFull = maxCount > 0 && currentCount >= maxCount;
        return (
          <div className={style.counterDisplay}>
            <div className={style.counterBar}>
              <div
                className={style.counterFill}
                style={{
                  width: maxCount
                    ? `${Math.min(100, (currentCount / maxCount) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <div className={style.counterText}>
              모집 현황: {currentCount}
              {maxCount > 0 ? ` / ${maxCount}명` : "명"}
              {isFull && (
                <span className={style.counterClosedBadge}>마감</span>
              )}
            </div>
          </div>
        );
      }

      case "userSelect": {
        const selectedUser = value as
          | { user: string; userId: string; userName: string }
          | undefined;
        const searchQuery = userSearchQuery[field._id] || "";
        const results = userSearchResults[field._id] || [];

        if (disabled && selectedUser?.userName) {
          return (
            <div className={style.userSelectDisplay}>
              {selectedUser.userName} ({selectedUser.userId})
            </div>
          );
        }

        return (
          <div className={style.userSelectContainer}>
            {selectedUser?.userName ? (
              <div className={style.userSelectSelected}>
                <span>
                  {selectedUser.userName} ({selectedUser.userId})
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className={style.removeBtn}
                    onClick={() => {
                      setValue(field._id, undefined);
                      setUserSearchQuery((p) => ({
                        ...p,
                        [field._id]: "",
                      }));
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <>
                <input
                  className={style.textInput}
                  placeholder="이름 또는 아이디로 검색"
                  value={searchQuery}
                  onChange={(e) =>
                    setUserSearchQuery((p) => ({
                      ...p,
                      [field._id]: e.target.value,
                    }))
                  }
                  disabled={disabled}
                />
                {results.length > 0 && (
                  <div className={style.userSearchDropdown}>
                    {results.map((u) => (
                      <div
                        key={u._id}
                        className={style.userSearchItem}
                        onClick={() => {
                          setValue(field._id, {
                            user: u._id,
                            userId: u.userId,
                            userName: u.userName,
                          });
                          setUserSearchQuery((p) => ({
                            ...p,
                            [field._id]: "",
                          }));
                          setUserSearchResults((p) => ({
                            ...p,
                            [field._id]: [],
                          }));
                        }}
                      >
                        {u.userName} ({u.userId})
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

      case "approval": {
        const lineSteps = getApprovalLineSteps(field);
        const approvalData = normalizeApprovalValue(value, field);

        // 제출 후·개별 보기: 결재 팝업·기록 문서와 같은 진행 상황
        if ((isSubmitted || isReviewMode) && !editingSubmitted && approvalData) {
          const hasLegacyReason =
            !approvalData.steps.some((s) => s.reason) && !!approvalData.reason;
          const skipped =
            approvalData.steps.length === 0 &&
            approvalData.overallStatus === "approved";
          return (
            <div className={style.approvalStatus}>
              {skipped && (
                <span
                  className={`${style.approvalBadge} ${style.badgeApproved}`}
                >
                  결재 생략
                </span>
              )}
              <ApprovalProgressBlock
                approvalData={approvalData}
                currentStepIndex={approvalData.currentStep}
                legacyReason={
                  hasLegacyReason ? approvalData.reason : undefined
                }
              />
            </div>
          );
        }

        // 제출 전: 고정·지정 단계를 결재선 순서로 표시
        const pickSteps = lineSteps.filter((s) => s.mode === "pick");
        const writerUsers = board.writers?.users || [];
        const useNestedCirculation = !formHasCirculationField(form?.fields);
        const circulationDef = useNestedCirculation
          ? getApprovalCirculation(field)
          : { mode: "off" as const, users: [] as TApprovalApprover[] };
        const boardAdmins = (
          board as {
            admins?: {
              users?: { user?: string; userId?: string; userName?: string }[];
            };
          }
        ).admins?.users;
        const approvalCandidates = uniqueApprovalCandidates(
          board.writers?.users,
          boardAdmins
        );
        const circulationCandidates = uniqueApprovalCandidates(
          board.members?.users,
          board.writers?.users,
          boardAdmins
        );

        const currentPicks: Record<number, any> = {};
        if (value?.version === 2 && Array.isArray(value.steps)) {
          let pickIdx = 0;
          value.steps.forEach((s: any) => {
            if (s?.mode === "pick") {
              if (s.approver) currentPicks[pickIdx] = s.approver;
              pickIdx += 1;
            }
          });
        } else if (value?.approver && pickSteps.length === 1) {
          currentPicks[0] = value.approver;
        }

        const currentCirculation: TApprovalApprover[] =
          circulationDef.mode === "off"
            ? []
            : circulationDef.mode === "fixed"
              ? circulationDef.users
              : Array.isArray(value?.circulation)
                ? value.circulation
                : [];

        const buildValueFromPicks = (
          picks: Record<number, any>,
          circulation = currentCirculation
        ) => {
          let pickIdx = 0;
          const steps = lineSteps.map((def) => {
            const approver =
              def.mode === "fixed" ? def.approver : picks[pickIdx++];
            return {
              order: def.order,
              label: def.label,
              mode: def.mode,
              approver,
              status: "waiting" as const,
            };
          });
          return {
            version: 2 as const,
            currentStep: 0,
            overallStatus: "pending" as const,
            status: "pending",
            approver: steps[0]?.approver,
            steps,
            circulation: useNestedCirculation ? circulation : [],
          };
        };

        const pickSearchUsers =
          approvalCandidates.length > 0 ? approvalCandidates : writerUsers;

        const circulationBlock =
          circulationDef.mode === "off" ? null : circulationDef.mode ===
            "fixed" ? (
            currentCirculation.length > 0 ? (
              <div className={style.approvalCirculationLine}>
                <span className={style.approvalCirculationLabel}>회람</span>
                <CirculationUserChips users={currentCirculation} />
              </div>
            ) : null
          ) : (
            <div>
              <div className={style.approvalPickRow}>
                <span className={style.approvalPickLabel}>회람</span>
                <SettingsHint text="기본이 있으면 바꿀 수 있고, 비울 수 있습니다." />
              </div>
              <ApprovalCirculationPicker
                selected={currentCirculation}
                candidates={circulationCandidates}
                disabled={disabled}
                onChange={(users) =>
                  setValue(field._id, buildValueFromPicks(currentPicks, users))
                }
              />
            </div>
          );

        const composeRows = getApprovalComposeRows(lineSteps, currentPicks);

        return (
          <div className={style.approvalCompose}>
            {reuseNoticeFieldId === field._id && reuseDroppedNotice && (
              <span className={style.approvalFieldHint}>
                {reuseDroppedNotice}
              </span>
            )}
            {composeRows.map((row) => {
              if (row.kind === "fixed") {
                return (
                  <div key={row.key} className={style.userSelectContainer}>
                    <div className={style.approvalPickRow}>
                      <span className={style.approvalPickLabel}>
                        {row.label}
                      </span>
                      <SettingsHint text="양식에서 정해진 결재자입니다." />
                    </div>
                    {row.approver?.userName || row.approver?.userId ? (
                      <CirculationUserChips users={[row.approver]} />
                    ) : (
                      <span className={style.approvalFieldHint}>
                        고정 승인자 없음
                      </span>
                    )}
                  </div>
                );
              }

              const selected = row.selected;
              const pickIndex = row.pickIndex;
              return (
                <div key={row.key} className={style.userSelectContainer}>
                  <div className={style.approvalPickRow}>
                    <span className={style.approvalPickLabel}>
                      {row.label} 승인자 선택
                    </span>
                    <SettingsHint text="기본이 있으면 바꿀 수 있습니다. 비우면 이 단계는 건너뜁니다." />
                  </div>
                  {selected?.userName ? (
                    <CirculationUserChips
                      users={[selected]}
                      onRemove={
                        disabled
                          ? undefined
                          : () => {
                              const next = { ...currentPicks };
                              delete next[pickIndex];
                              setValue(field._id, buildValueFromPicks(next));
                            }
                      }
                    />
                  ) : (
                    <>
                      <ApprovalUserSearchInput
                        candidates={pickSearchUsers}
                        disabled={disabled}
                        ariaLabel={`${row.label} 승인자 검색`}
                        onPick={(u) => {
                          const next = {
                            ...currentPicks,
                            [pickIndex]: {
                              user: u.user,
                              userId: u.userId,
                              userName: u.userName,
                            },
                          };
                          setValue(field._id, buildValueFromPicks(next));
                        }}
                      />
                      <span className={style.approvalFieldHint}>지정 안 함</span>
                    </>
                  )}
                </div>
              );
            })}
            {circulationBlock}
          </div>
        );
      }

      case "circulation": {
        const circDef = getCirculationConfig(field);
        const boardAdmins = (
          board as {
            admins?: {
              users?: { user?: string; userId?: string; userName?: string }[];
            };
          }
        ).admins?.users;
        const circulationCandidates = uniqueApprovalCandidates(
          board.members?.users,
          board.writers?.users,
          boardAdmins
        );
        const selected: TApprovalApprover[] =
          circDef.mode === "fixed"
            ? circDef.users
            : Array.isArray(value)
              ? value
              : [];

        if ((isSubmitted || isReviewMode) && !editingSubmitted && selected.length > 0) {
          return (
            <div className={style.approvalCirculationLine}>
              <CirculationUserChips users={selected} />
            </div>
          );
        }
        if (circDef.mode === "fixed") {
          return selected.length > 0 ? (
            <div>
              {reuseNoticeFieldId === field._id && reuseDroppedNotice && (
                <span className={style.approvalFieldHint}>
                  {reuseDroppedNotice}
                </span>
              )}
              <div className={style.approvalPickRow}>
                <span className={style.approvalPickLabel}>회람</span>
                <SettingsHint text="양식에서 정해진 회람자입니다." />
              </div>
              <CirculationUserChips users={selected} />
            </div>
          ) : (
            <span className={style.approvalFieldHint}>고정 회람자 없음</span>
          );
        }
        if (circDef.mode === "off") {
          return null;
        }
        return (
          <div>
            {reuseNoticeFieldId === field._id && reuseDroppedNotice && (
              <span className={style.approvalFieldHint}>
                {reuseDroppedNotice}
              </span>
            )}
            <div className={style.approvalPickRow}>
              <span className={style.approvalPickLabel}>회람</span>
              <SettingsHint text="기본이 있으면 바꿀 수 있고, 비울 수 있습니다." />
            </div>
            <ApprovalCirculationPicker
              selected={selected}
              candidates={circulationCandidates}
              disabled={disabled}
              onChange={(users) => setValue(field._id, users)}
            />
          </div>
        );
      }

      case "file": {
        const items: any[] = Array.isArray(value) ? value : [];
        const isUploading = uploadingFields[field._id] || false;

        const handleFileSelect = async (file: File) => {
          if (file.size > 20 * 1024 * 1024) {
            alert(`${file.name}: 파일 크기는 20MB 이하여야 합니다.`);
            return;
          }
          setUploadingFields((p) => ({ ...p, [field._id]: true }));
          try {
            const formData = new FormData();
            formData.append("file", file);
            const result = await FileAPI.CUploadFileForm({
              data: formData,
            });
            setValue(field._id, [
              ...items,
              {
                originalName: result.originalName,
                key: result.key,
                mimeType: result.mimeType,
                size: result.size,
              },
            ]);
          } catch (err) {
            ALERT_ERROR(err);
          } finally {
            setUploadingFields((p) => ({ ...p, [field._id]: false }));
            const ref = fileRefs.current[field._id];
            if (ref) ref.value = "";
          }
        };

        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files[0];
          if (file) handleFileSelect(file);
        };

        const removeItem = (index: number) => {
          setValue(
            field._id,
            items.filter((_, idx) => idx !== index)
          );
        };

        return (
          <div className={style.fileUploadArea}>
            {items.map((item, i) => {
              if (isFileAnswerLink(item)) {
                const href = sanitizeHttpUrl(item.url);
                if (!href) return null;
                const display = linkDisplayTitle({ ...item, url: href });
                const ogImage =
                  sanitizeHttpUrl(item.ogImage || "") ||
                  youtubeThumbnailUrl(href);
                return (
                  <div key={`link-${href}-${i}`} className={style.docLinkItem}>
                    <a
                      className={style.linkPreview}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkPreviewThumb src={ogImage} />
                      <div className={style.linkPreviewText}>
                        <div className={style.linkPreviewTitle}>{display}</div>
                        {item.ogDescription && (
                          <div className={style.linkPreviewDesc}>
                            {item.ogDescription}
                          </div>
                        )}
                        <div className={style.linkPreviewUrl}>
                          {linkPreviewHostname(href)}
                        </div>
                      </div>
                    </a>
                    {!disabled && (
                      <button
                        type="button"
                        className={style.fileRemoveBtn}
                        onClick={() => removeItem(i)}
                        aria-label={`${display} 삭제`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              }
              if (!isFileAnswerFile(item)) return null;
              return (
                <FileAttachCard
                  key={item.key}
                  file={item}
                  onPreview={setPreviewFile}
                  onRemove={disabled ? undefined : () => removeItem(i)}
                />
              );
            })}

            {isUploading && (
              <div className={style.uploadProgress}>업로드 중...</div>
            )}

            {!disabled && !isUploading && (
              <>
                <input
                  ref={(el) => {
                    fileRefs.current[field._id] = el;
                  }}
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <div
                  className={style.fileDropZone}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleDrop}
                  onClick={() => fileRefs.current[field._id]?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileRefs.current[field._id]?.click();
                    }
                  }}
                  aria-label="파일 업로드"
                >
                  <span style={{ fontSize: "20px", opacity: 0.5 }}>📎</span>
                  <span
                    style={{ fontSize: "13px", color: "var(--text-color-2)" }}
                  >
                    파일을 드래그하거나{" "}
                    <span
                      style={{
                        color: "var(--accent-1)",
                        fontWeight: 500,
                      }}
                    >
                      클릭하여 선택
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-color-2)",
                      opacity: 0.6,
                    }}
                  >
                    최대 20MB
                    {items.length > 0 && ` · ${items.length}개 첨부됨`}
                  </span>
                </div>
                <button
                  type="button"
                  className={style.docLinkAdd}
                  onClick={() => setFileLinkFieldId(field._id)}
                >
                  <span className={style.docLinkAddIcon} aria-hidden>
                    🔗
                  </span>
                  <span>링크를 클릭하여 첨부</span>
                </button>
              </>
            )}
            {fileLinkFieldId === field._id && (
              <LinkAttachModal
                onClose={() => setFileLinkFieldId(null)}
                onAdd={(link) => {
                  setValue(field._id, [...items, link]);
                  setFileLinkFieldId(null);
                }}
              />
            )}
          </div>
        );
      }

      case "link": {
        const linkData =
          typeof value === "object" && value ? value : {};
        const isFetching = fetchingOg[field._id] || false;

        const handleLinkChange = (url: string) => {
          setValue(field._id, { ...(data[field._id] || {}), url });

          if (ogFetchTimers.current[field._id]) {
            clearTimeout(ogFetchTimers.current[field._id]);
          }

          const trimmed = url.trim();
          if (trimmed) {
            ogFetchTimers.current[field._id] = setTimeout(async () => {
              try {
                setFetchingOg((p) => ({ ...p, [field._id]: true }));
                let fetchUrl = trimmed;
                if (!/^https?:\/\//i.test(fetchUrl)) {
                  fetchUrl = "https://" + fetchUrl;
                }
                const ogData = await PostAPI.RPostOgMeta({
                  query: { url: fetchUrl },
                });
                setValue(field._id, {
                  ...data[field._id],
                  url: fetchUrl,
                  ogTitle: ogData.ogTitle || undefined,
                  ogDescription: ogData.ogDescription || undefined,
                  ogImage: ogData.ogImage || undefined,
                });
              } catch {
                setValue(field._id, { ...data[field._id], url: trimmed });
              } finally {
                setFetchingOg((p) => ({ ...p, [field._id]: false }));
              }
            }, 500);
          }
        };

        return (
          <div className={style.linkFieldArea}>
            <input
              type="text"
              className={style.textInput}
              placeholder="제목을 입력하세요"
              value={linkData.title || ""}
              onChange={(e) =>
                setValue(field._id, {
                  ...(data[field._id] || {}),
                  title: e.target.value,
                })
              }
              disabled={disabled}
            />
            <input
              type="url"
              className={style.textInput}
              placeholder="https://example.com"
              value={linkData.url || ""}
              onChange={(e) => handleLinkChange(e.target.value)}
              disabled={disabled}
            />
            {isFetching && (
              <div className={style.linkFetching}>미리보기 로딩 중...</div>
            )}
            {!isFetching && linkData.url && (
              <a
                href={linkData.url}
                target="_blank"
                rel="noopener noreferrer"
                className={style.linkPreview}
              >
                <LinkPreviewThumb src={linkData.ogImage} />
                <div className={style.linkPreviewText}>
                  <div className={style.linkPreviewTitle}>
                    {linkData.title || linkData.ogTitle || linkData.url}
                  </div>
                  {linkData.ogDescription && (
                    <div className={style.linkPreviewDesc}>
                      {linkData.ogDescription}
                    </div>
                  )}
                  <div className={style.linkPreviewUrl}>
                    {(() => {
                      try {
                        return new URL(linkData.url).hostname;
                      } catch {
                        return linkData.url;
                      }
                    })()}
                  </div>
                </div>
              </a>
            )}
          </div>
        );
      }

      default:
        return (
          <input
            className={style.textInput}
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
            disabled={disabled}
          />
        );
    }
  };

  if (isLoading || !form) return null;

  const reviewSubmittedAt = activeRow?._submittedAt
    ? new Date(activeRow._submittedAt).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={style.rendererContainer}>
      {/* 헤더: 보드 페이지 왼쪽 기준에 맞춤 (중앙 컬럼 밖) */}
      <div className={style.builderHeader}>
        <div className={style.builderHeaderLeft}>
          <button className={style.backBtn} onClick={onBack}>
            <Svg type="chevronLeft" width="20px" height="20px" />
          </button>
          <span className={style.rendererHeaderTitle}>{form.title}</span>
          {requiredTarget != null && (
            <span
              className={`${style.formCardBadge} ${
                multipleQuotaReached
                  ? style.badgeSubmitted
                  : style.badgePending
              }`}
              title={
                multipleQuotaReached
                  ? "목표 제출 횟수를 모두 채웠습니다."
                  : `필수 제출 ${Math.min(submittedRows.length, requiredTarget)}/${requiredTarget}`
              }
            >
              {Math.min(submittedRows.length, requiredTarget)}/{requiredTarget}
            </span>
          )}
        </div>
        {canShowWriteTab && canShowSubmitted && (
          <div className={style.viewModeToggle} role="tablist" aria-label="응답 보기">
            <button
              type="button"
              role="tab"
              aria-selected={isComposeMode}
              className={`${style.viewModeBtn} ${
                isComposeMode ? style.viewModeBtnActive : ""
              }`}
              onClick={() => switchViewMode("compose")}
              title="작성"
            >
              작성
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isReviewMode}
              className={`${style.viewModeBtn} ${
                isReviewMode ? style.viewModeBtnActive : ""
              }`}
              onClick={() => switchViewMode("review")}
            >
              내 응답
            </button>
          </div>
        )}
      </div>

      <div className={style.rendererBody}>
      {/* 양식 제목·설명 */}
      <div className={style.rendererHeader}>
        <div className={style.rendererHeaderBody}>
          <h2 className={style.rendererTitle}>{form.title}</h2>
          {form.description?.trim() &&
            form.description.trim() !== form.title?.trim() && (
              <p className={style.rendererDesc}>{form.description}</p>
            )}
        </div>
      </div>

      {(isComposeMode || editingSubmitted) &&
        !(isComposeMode && isSubmitted && !canResubmit) &&
        (!actionsInBanner ||
          (isSubmitted && myRow && (canResubmit || editingSubmitted))) && (
        <div className={`${style.submitArea} ${style.noPrint}`}>
          {isSubmitted && myRow && (canResubmit || editingSubmitted) && (
              <Button type="ghost" onClick={handleWithdraw}>
                삭제
              </Button>
            )}
          {canShowSaveDraft && composeDirty && !actionsInBanner && (
            <Button
              type="ghost"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
            >
              {isSavingDraft ? "저장 중..." : "임시 저장"}
            </Button>
          )}
          {canShowSubmit && !actionsInBanner && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isSavingDraft}
            >
              {isSubmitting ? "제출 중..." : submitLabel}
            </Button>
          )}
        </div>
      )}

      {(isClosed ||
        isNotOpen ||
        outsideWeekdayPeriod ||
        submittedThisOccurrence ||
        (isComposeMode && isSubmitted) ||
        isReviewMode) && (
        <div className={style.rendererMeta}>
          {isClosed && (
            <span className={`${style.formCardBadge} ${style.badgeClosed}`}>
              마감됨
            </span>
          )}
          {isNotOpen && (
            <span className={`${style.formCardBadge} ${style.badgeClosed}`}>
              아직 시작 전
            </span>
          )}
          {!isClosed && !isNotOpen && outsideWeekdayPeriod && (
            <span className={`${style.formCardBadge} ${style.badgeClosed}`}>
              지금은 제출 기간이 아닙니다
            </span>
          )}
          {!isClosed &&
            !isNotOpen &&
            submittedThisOccurrence &&
            !multipleQuotaReached && (
              <span className={`${style.formCardBadge} ${style.badgeOpen}`}>
                이번 회차 제출 완료
              </span>
            )}
          {isComposeMode && isSubmitted && (
            <span className={`${style.formCardBadge} ${style.badgeOpen}`}>
              응답 완료
            </span>
          )}
          {isReviewMode && (
            <span className={`${style.formCardBadge} ${style.badgeSubmitted}`}>
              {editingSubmitted ? "수정 중" : "개별 보기"}
            </span>
          )}
        </div>
      )}

      {weekdayOn &&
        isComposeMode &&
        windowOpen &&
        openOccurrences.length > 0 &&
        form && (
          <div className={style.occurrenceList} role="list">
            {openOccurrences.map((occ) => {
              const done = hasSubmittedOccurrence(form, submittedRows, occ);
              const selectable =
                !done && unsubmittedOpenOccurrences.length > 1;
              const selected = selectedOccurrenceKey === occ.key;
              return (
                <button
                  key={occ.key}
                  type="button"
                  role="listitem"
                  className={`${style.occurrenceChip} ${
                    selected && selectable ? style.occurrenceChipSelected : ""
                  } ${done ? style.occurrenceChipDone : ""}`}
                  aria-pressed={selectable ? selected : undefined}
                  disabled={done || !selectable}
                  onClick={() => {
                    if (selectable) setSelectedOccurrenceKey(occ.key);
                  }}
                >
                  <span>{formatOccurrenceStatusLabel(occ)}</span>
                  <span className={style.occurrenceChipStatus}>
                    {done ? "제출완료" : "남음"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

      {((isComposeMode && inProgressItems.length > 1) ||
        (isReviewMode && listRows.length > 0)) && (
        <div className={style.reviewNav}>
          <button
            type="button"
            className={style.reviewNavBtn}
            disabled={reviewIndex <= 0}
            onClick={() => goListRow(reviewIndex - 1)}
            title={isComposeMode ? "이전 저장본" : "이전 응답"}
          >
            <Svg type="chevronLeft" width="18px" height="18px" />
          </button>
          <span className={style.reviewNavCount}>
            {reviewIndex + 1} /{" "}
            {(isComposeMode ? inProgressItems : listRows).length}
          </span>
          <button
            type="button"
            className={style.reviewNavBtn}
            disabled={
              reviewIndex >=
              (isComposeMode ? inProgressItems : listRows).length - 1
            }
            onClick={() => goListRow(reviewIndex + 1)}
            title={isComposeMode ? "다음 저장본" : "다음 응답"}
          >
            <Svg type="chevronRight" width="18px" height="18px" />
          </button>
        </div>
      )}

      {/* 퀴즈 점수 배너 */}
      {quizScoreVisible && activeRow && (
        <div className={style.quizScoreBanner}>
          <div className={style.quizScoreIcon}>📝</div>
          <div className={style.quizScoreText}>
            <strong>
              점수: {activeRow.data?._quiz_score ?? 0} /{" "}
              {activeRow.data?._quiz_total ?? 0}점
            </strong>
            {activeRow.data?._quiz_total > 0 && (
              <span>
                (
                {Math.round(
                  ((activeRow.data?._quiz_score ?? 0) /
                    activeRow.data._quiz_total) *
                    100
                )}
                %)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 평가 결과 (확정 후만) */}
      {assessmentFinalized &&
        activeRow?.data?._assessment &&
        form && (
          <AssessmentResultBanner
            form={form}
            assessment={activeRow.data._assessment as TAssessmentData}
          />
        )}

      {/* 평가 대기 */}
      {assessmentPending && (
        <div className={style.readonlyBanner}>
          <div className={style.readonlyBannerText}>
            <strong>과제가 제출되었습니다.</strong>
            <span>평가가 확정되면 결과를 확인할 수 있습니다.</span>
          </div>
        </div>
      )}

      {(showLocalBanner || isServerDraftSlot) && (
        <div className={style.readonlyBanner}>
          <div className={style.readonlyBannerText}>
            <strong>
              {isLocalDraftItem
                ? hasLocalBannerContent
                  ? "이 브라우저에 저장됨 — 아직 서버에 올리지 않았습니다."
                  : "새 응답을 작성 중입니다."
                : "저장됨 — 아직 제출되지 않았습니다."}
            </strong>
            {isLocalDraftItem && hasLocalBannerContent && lastSavedAt && (
              <span>
                저장됨 ·{" "}
                {new Date(lastSavedAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {activeRow?._updatedAt && (
              <span>
                저장:{" "}
                {new Date(activeRow._updatedAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <div className={`${style.reviewBannerActions} ${style.noPrint}`}>
            {canShowSaveDraft && composeDirty && (
              <button
                type="button"
                className={style.reviewReuseBtn}
                onClick={handleSaveDraft}
                disabled={isSavingDraft || isSubmitting}
                title="임시 저장"
              >
                {isSavingDraft ? "저장 중..." : "임시 저장"}
              </button>
            )}
            {(!isLocalDraftItem || hasLocalBannerContent) && (
            <button
              type="button"
              className={style.reviewReuseBtn}
              onClick={handleWithdraw}
              disabled={isSubmitting}
              title={isLocalDraftItem ? "새로 작성" : "저장본 삭제"}
            >
              {isLocalDraftItem ? "새로 작성" : "삭제"}
            </button>
            )}
            {canShowSubmit && (
              <button
                type="button"
                className={`${style.reviewReuseBtn} ${style.reviewReuseBtnPrimary}`}
                onClick={handleSubmit}
                disabled={isSubmitting || isSavingDraft}
                title={submitLabel}
              >
                {isSubmitting ? "제출 중..." : submitLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {isReviewMode && editingSubmitted && (
        <div className={style.readonlyBanner}>
          <div className={style.readonlyBannerText}>
            <strong>기존 응답을 수정 중입니다.</strong>
            {reviewSubmittedAt && <span>제출일: {reviewSubmittedAt}</span>}
          </div>
          <div className={style.reviewBannerActions}>
            <button
              type="button"
              className={style.reviewReuseBtn}
              onClick={() => openReview(reviewIndex)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 개별 보기: 안내 카드 (수정·삭제·재사용은 박스 안) */}
      {isReviewMode && !editingSubmitted && (
        <div className={style.readonlyBanner}>
          <div className={style.readonlyBannerText}>
            <strong>
              {canEditReviewRow
                ? "이 응답을 수정하거나 삭제할 수 있습니다."
                : "응답은 수정할 수 없습니다."}
            </strong>
            {reviewSubmittedAt && <span>제출일: {reviewSubmittedAt}</span>}
          </div>
          {(canEditReviewRow || canComposeMultiple) && (
            <div className={`${style.reviewBannerActions} ${style.noPrint}`}>
              {canEditReviewRow && (
                <button
                  type="button"
                  className={style.reviewReuseBtn}
                  onClick={editCurrentResponse}
                  disabled={isSubmitting}
                  title="이 응답 수정"
                >
                  수정
                </button>
              )}
              {canEditReviewRow && (
                <button
                  type="button"
                  className={style.reviewReuseBtn}
                  onClick={handleWithdraw}
                  disabled={isSubmitting}
                  title="이 응답 삭제"
                >
                  삭제
                </button>
              )}
              {canComposeMultiple && (
                <button
                  type="button"
                  className={style.reviewReuseBtn}
                  onClick={reuseCurrentResponse}
                  title="이 내용으로 새로 작성"
                >
                  재사용
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 제출 완료 배너 (작성 모드) */}
      {isComposeMode &&
        isSubmitted &&
        !canResubmit &&
        !quizScoreVisible &&
        !assessmentPending &&
        !assessmentFinalized && (
        <div className={style.successBanner}>
          <div className={style.successIcon}>✓</div>
          <div className={style.successText}>
            <strong>
              {form?.settings.assessmentMode
                ? "과제가 제출되었습니다."
                : "응답이 제출되었습니다."}
            </strong>
            <span>
              {myRow?._submittedAt &&
                `제출일: ${new Date(myRow._submittedAt).toLocaleString("ko-KR", {
                  year: "numeric", month: "2-digit", day: "2-digit",
                  weekday: "short", hour: "2-digit", minute: "2-digit",
                })}`}
            </span>
          </div>
        </div>
      )}
      {/* 응답자 필드 */}
      {(!isSubmitted || canResubmit || form?.settings.showOwnResponse !== false || quizScoreVisible || assessmentFinalized || assessmentPending || isReviewMode || isComposeMode) &&
        respondentFields.map((field) => {
          if (field.type === "content") {
            return (
              <div key={field._id} className={style.questionItem}>
                {field.label?.trim() && (
                  <div className={style.questionLabel}>
                    <span className={style.questionLabelText}>{field.label}</span>
                  </div>
                )}
                <div className={style.contentFieldBody}>
                  <MarkdownViewer
                    content={field.content || ""}
                    allowHtmlApp
                  />
                  <FieldDocResources
                    attachments={field.attachments}
                    links={field.links}
                    onPreview={setPreviewFile}
                  />
                </div>
              </div>
            );
          }

          const disabled = isComposeMode
            ? !canSubmit
            : isReviewMode
              ? !editingSubmitted
              : isSubmitted
                ? !canResubmit
                : !canSubmit;
          const quizMark = getQuizMark(field);

          const assessmentRubrics =
            form?.settings.assessmentMode && field.gradingMethod === "rubric"
              ? getFieldRubrics(field, form.rubrics)
              : [];
          const assessmentGrade = assessmentFinalized
            ? (activeRow?.data?._assessment as TAssessmentData | undefined)
                ?.byField?.[field._id]
            : undefined;
          const assessmentSelected =
            assessmentFinalized && assessmentRubrics.length
              ? selectedLevelsFromDraft(
                  {
                    levelId: assessmentGrade?.levelId,
                    byRubric: assessmentGrade?.byRubric,
                  },
                  assessmentRubrics
                )
              : {};

          return (
            <div key={field._id} className={style.questionWithAssessment}>
              <div
                className={`${style.questionItem} ${
                  quizMark === true
                    ? style.questionCorrect
                    : quizMark === false
                      ? style.questionWrong
                      : ""
                }`}
              >
                <div className={style.questionLabel}>
                  <span className={style.questionLabelText}>{field.label}</span>
                  {field.required && (
                    <span className={style.requiredMark}>*</span>
                  )}
                  {quizMark === true && (
                    <span className={style.quizMarkCorrect}>✓</span>
                  )}
                  {quizMark === false &&
                    form.settings.quizSettings?.showWrongMarks && (
                      <span className={style.quizMarkWrong}>✗</span>
                    )}
                  {field.points != null &&
                    field.points > 0 &&
                    form.settings.quizMode && (
                      <span className={style.pointsBadge}>
                        {field.points}점
                      </span>
                    )}
                </div>
                {renderField(field, disabled)}
                {errors[field._id] && (
                  <div className={style.questionError}>{errors[field._id]}</div>
                )}
                {/* 퀴즈 정답 표시 */}
                {quizAnswerVisible &&
                  field.correctAnswer !== undefined &&
                  field.correctAnswer !== null && (
                    <div className={style.correctAnswerHint}>
                      정답:{" "}
                      {Array.isArray(field.correctAnswer)
                        ? field.correctAnswer.join(", ")
                        : String(field.correctAnswer)}
                    </div>
                  )}
              </div>
              {assessmentRubrics.length > 0 && (
                <aside
                  className={style.questionAssessmentAside}
                  aria-label={`${field.label} 평가 기준`}
                >
                  <div className={style.questionAssessmentAsideHeader}>
                    <span className={style.questionAssessmentAsideTitle}>
                      평가 기준
                    </span>
                    <span
                      className={style.questionAssessmentAsideHint}
                      title="채점용 안내입니다. 여기에 작성하지 마세요."
                    >
                      <Svg type="info-circle" width="12px" height="12px" />
                      채점용
                    </span>
                  </div>
                  <FieldRubricPanel
                    rubrics={assessmentRubrics}
                    mode="criteria"
                    selectedByRubric={assessmentSelected}
                    toggleLabel="기준 자세히 보기"
                  />
                </aside>
              )}
            </div>
          );
        })}

      {/* owner 필드 중 응답자에게 공개된 것 (읽기전용) */}
      {visibleOwnerFields.length > 0 && (isSubmitted || isReviewMode) && (
        <>
          {visibleOwnerFields.map((field) => (
            <div key={field._id} className={style.questionItem}>
              <div className={style.questionLabel}>
                <span className={style.questionLabelText}>{field.label}</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-color-2)",
                    marginLeft: "8px",
                  }}
                >
                  (관리자 입력)
                </span>
              </div>
              {renderField(field, true)}
            </div>
          ))}
        </>
      )}

      {/* 양식에서 삭제된 필드의 기존 응답 */}
      {orphanResponses.length > 0 && (
        <div className={style.orphanResponses}>
          <div className={style.orphanResponsesTitle}>이전 응답</div>
          <p className={style.orphanResponsesHint}>
            양식에서 삭제·변경된 항목의 제출 내용입니다. 시트에는 그대로
            남아 있습니다.
          </p>
          {orphanResponses.map(([key, val]) => (
            <div key={key} className={style.questionItem}>
              <div className={style.questionLabel}>
                <span className={style.questionLabelText}>삭제된 항목</span>
                <span className={style.orphanKey}>{key.slice(0, 8)}…</span>
              </div>
              <div className={style.orphanValue}>
                {formatOrphanValue(val)}
              </div>
            </div>
          ))}
        </div>
      )}

      </div>
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};

export default AltFormRenderer;
