import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TBoard } from "types/board";
import {
  TAltForm,
  TAltFormField,
  TAssessmentData,
  TAssessmentFieldGrade,
  TAssessmentFieldRubricGrade,
  TDisplayCondition,
} from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import { TChatUser } from "types/chat";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import { MarkdownEditor, MarkdownViewer } from "components/markdown";
import {
  getApprovalLineSteps,
  normalizeApprovalValue,
} from "utils/approvalLine";

type Props = {
  board: TBoard;
  formId: string;
  onBack: () => void;
  /** URL mode=responses 등으로 개별 보기에서 시작 */
  initialViewMode?: "compose" | "review";
  /** standalone에서 URL mode 동기화 */
  onViewModeChange?: (mode: "compose" | "review") => void;
};

type TViewMode = "compose" | "review";

/** 필수+복수일 때 목표 제출 횟수. 해당 아니면 null */
const getRequiredResponseCount = (form: TAltForm | null): number | null => {
  if (!form) return null;
  if (form.settings?.requiredMode !== true) return null;
  if (!form.settings?.allowMultipleResponses) return null;
  const n = Number(form.settings.requiredResponseCount);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
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

/** 새/빈 응답의 docResponse 필드만 현재 템플릿으로 초기화 (기존 제출값 유지) */
const withDocResponseDefaults = (
  fields: TAltFormField[],
  existing: Record<string, any> = {}
): Record<string, any> => {
  const next = { ...existing };
  for (const field of fields) {
    if (field.type !== "docResponse") continue;
    if (next[field._id] === undefined || next[field._id] === null) {
      next[field._id] = field.content ?? "";
    }
  }
  return next;
};

const AltFormRenderer = ({
  board,
  formId,
  onBack,
  initialViewMode = "compose",
  onViewModeChange,
}: Props) => {
  const { AltFormAPI, AltSheetRowAPI, ChatAPI, FileAPI, PostAPI } = useAPIv2();
  const { currentSchool, currentRegistration } = useAuth();

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
  const [viewMode, setViewMode] = useState<TViewMode>("compose");
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // counter 필드용 현재 카운트
  const [counterCounts, setCounterCounts] = useState<Record<string, number>>(
    {}
  );

  // file 필드용
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingFields, setUploadingFields] = useState<
    Record<string, boolean>
  >({});

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

  useEffect(() => {
    Promise.all([
      AltFormAPI.RAltForm({ params: { _id: formId } }),
      AltSheetRowAPI.RAltSheetRowMy({ query: { form: formId } }),
    ])
      .then(([{ form: loadedForm }, { rows }]) => {
        setForm(loadedForm);
        const loadedRows = rows || [];
        setMyRows(loadedRows);
        setReviewIndex(0);

        const canReview =
          loadedForm.settings.showOwnResponse !== false &&
          loadedRows.length > 0;
        const startInReview =
          initialViewMode === "review" && canReview;
        setViewMode(startInReview ? "review" : "compose");

        if (loadedForm.settings.allowMultipleResponses) {
          // 다중 응답: 작성 모드는 빈 폼 (이전 응답은 개별 보기에서만)
          setMyRow(null);
          setIsSubmitted(false);
          const target = getRequiredResponseCount(loadedForm);
          const quotaReached =
            target != null && loadedRows.length >= target;
          if (startInReview || (quotaReached && canReview)) {
            const row = loadedRows[0];
            setData(
              withDocResponseDefaults(loadedForm.fields, row?.data || {})
            );
            if (quotaReached && !startInReview) {
              setViewMode("review");
            }
          } else {
            setData(withDocResponseDefaults(loadedForm.fields));
          }
        } else if (loadedRows[0]) {
          const row = loadedRows[0];
          setMyRow(row);
          setData(
            withDocResponseDefaults(loadedForm.fields, row.data || {})
          );
          setIsSubmitted(true);
        } else {
          setMyRow(null);
          setIsSubmitted(false);
          setData(withDocResponseDefaults(loadedForm.fields));
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

  /** 양식에서 삭제된 필드의 제출값 (스키마에 없는 data 키) */
  const activeRow =
    viewMode === "review" ? myRows[reviewIndex] ?? null : myRow;

  const canShowOwnResponses =
    form?.settings.showOwnResponse !== false && myRows.length > 0;

  const isReviewMode = viewMode === "review";

  const switchViewMode = (mode: TViewMode) => {
    if (!form) return;
    if (mode === "review") {
      if (!canShowOwnResponses) return;
      const idx = Math.min(reviewIndex, Math.max(0, myRows.length - 1));
      setReviewIndex(idx);
      const row = myRows[idx];
      if (row) {
        setData(withDocResponseDefaults(form.fields, row.data || {}));
      }
      setViewMode("review");
      onViewModeChange?.("review");
      return;
    }
    // compose
    const target = getRequiredResponseCount(form);
    if (
      form.settings.allowMultipleResponses &&
      target != null &&
      myRows.length >= target
    ) {
      return; // 목표 횟수 달성 시 추가 작성 불가
    }
    if (form.settings.allowMultipleResponses) {
      setData(withDocResponseDefaults(form.fields));
      setMyRow(null);
      setIsSubmitted(false);
    } else if (myRow) {
      setData(withDocResponseDefaults(form.fields, myRow.data || {}));
      setIsSubmitted(true);
    } else if (myRows[0]) {
      setMyRow(myRows[0]);
      setData(withDocResponseDefaults(form.fields, myRows[0].data || {}));
      setIsSubmitted(true);
    } else {
      setData(withDocResponseDefaults(form.fields));
      setIsSubmitted(false);
    }
    setErrors({});
    setViewMode("compose");
    onViewModeChange?.("compose");
  };

  const goReview = (nextIndex: number) => {
    if (!form || nextIndex < 0 || nextIndex >= myRows.length) return;
    setReviewIndex(nextIndex);
    const row = myRows[nextIndex];
    setData(withDocResponseDefaults(form.fields, row.data || {}));
  };

  /** 양식에서 삭제된 필드의 제출값 (스키마에 없는 data 키) */
  const orphanResponses = useMemo(() => {
    const rowForOrphans = isReviewMode ? activeRow : myRow;
    if ((!isSubmitted && !isReviewMode) || !rowForOrphans?.data || !form)
      return [];
    const fieldIds = new Set(form.fields.map((f) => f._id));
    return Object.entries(rowForOrphans.data).filter(([key, val]) => {
      if (!key || key.startsWith("_")) return false;
      if (fieldIds.has(key)) return false;
      if (val === undefined || val === null || val === "") return false;
      return true;
    });
  }, [isSubmitted, isReviewMode, activeRow, myRow, form]);

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

  const canSubmit = !isClosed && !isNotOpen;
  const requiredTarget = getRequiredResponseCount(form);
  const multipleQuotaReached =
    requiredTarget != null && myRows.length >= requiredTarget;
  const canComposeMultiple =
    !!form?.settings.allowMultipleResponses &&
    canSubmit &&
    !multipleQuotaReached;
  const canResubmit =
    !isReviewMode &&
    (form?.settings.allowResubmit || form?.settings.allowMultipleResponses) &&
    isSubmitted &&
    canSubmit &&
    !multipleQuotaReached;

  // 퀴즈 결과 가시성
  const quizScoreVisible = useMemo(() => {
    if (!form?.settings.quizMode) return false;
    const hasRow = isReviewMode ? !!activeRow : isSubmitted;
    if (!hasRow) return false;
    const reveal = form.settings.quizSettings?.scoreReveal;
    if (reveal === "immediately") return true;
    if (reveal === "afterDeadline") return !!isClosed;
    return false;
  }, [form, isSubmitted, isClosed, isReviewMode, activeRow]);

  const quizAnswerVisible = useMemo(() => {
    if (!form?.settings.quizMode) return false;
    const hasRow = isReviewMode ? !!activeRow : isSubmitted;
    if (!hasRow) return false;
    const reveal = form.settings.quizSettings?.answerReveal;
    if (reveal === "immediately") return true;
    if (reveal === "afterDeadline") return !!isClosed;
    return false;
  }, [form, isSubmitted, isClosed, isReviewMode, activeRow]);

  const assessmentFinalized = useMemo(() => {
    if (!form?.settings.assessmentMode) return false;
    const hasRow = isReviewMode ? !!activeRow : isSubmitted;
    if (!hasRow || !activeRow) return false;
    return activeRow.data?._assessment?.final?.status === "finalized";
  }, [form, isSubmitted, isReviewMode, activeRow]);

  const assessmentPending = useMemo(() => {
    if (!form?.settings.assessmentMode) return false;
    const hasRow = isReviewMode ? !!activeRow : isSubmitted;
    if (!hasRow || !activeRow) return false;
    return activeRow.data?._assessment?.final?.status !== "finalized";
  }, [form, isSubmitted, isReviewMode, activeRow]);

  const setValue = (fieldId: string, value: any) => {
    setData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

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
      } else if (field.required) {
        if (field.type === "file") {
          if (!Array.isArray(value) || value.length === 0) {
            newErrors[field._id] = "파일을 업로드해주세요.";
            continue;
          }
        } else if (field.type === "link") {
          if (!value || !value.url || !value.url.trim()) {
            newErrors[field._id] = "링크를 입력해주세요.";
            continue;
          }
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
      if (field.type === "approval" && field.required) {
        const line = getApprovalLineSteps(field);
        const pickCount = line.filter((s) => s.mode === "pick").length;
        const v = data[field._id];
        if (pickCount === 0) {
          // 전부 고정 — 설정 오류만 서버에서 걸러짐
        } else if (v?.version === 2 && Array.isArray(v.steps)) {
          const missing = v.steps.some(
            (s: any) => s.mode === "pick" && !s.approver?.userId
          );
          if (missing || v.steps.filter((s: any) => s.mode === "pick").length < pickCount) {
            newErrors[field._id] = "승인자를 모두 선택해주세요.";
          }
        } else if (!v?.approver?.userId) {
          newErrors[field._id] = "승인자를 선택해주세요.";
        }
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
    if (!form || !validate()) return;

    setIsSubmitting(true);
    try {
      const submitData = withDocResponseDefaults(form.fields, data);
      const { row } = await AltSheetRowAPI.CAltSheetRow({
        data: { form: form._id, data: submitData },
      });

      if (form.settings.allowMultipleResponses) {
        // 다중 응답: 제출 후 목록에 추가하고 작성 폼 초기화
        alert(
          form.settings.assessmentMode
            ? "과제가 제출되었습니다."
            : "응답이 제출되었습니다."
        );
        const nextRows = [row, ...myRows];
        setMyRows(nextRows);
        setMyRow(null);
        const target = getRequiredResponseCount(form);
        if (target != null && nextRows.length >= target) {
          setReviewIndex(0);
          setData(withDocResponseDefaults(form.fields, row.data || {}));
          setViewMode("review");
          onViewModeChange?.("review");
          setIsSubmitted(false);
        } else {
          setData(withDocResponseDefaults(form.fields));
          setIsSubmitted(false);
        }
      } else {
        setMyRow(row);
        setMyRows([row]);
        setData(withDocResponseDefaults(form.fields, row.data || submitData));
        setIsSubmitted(true);
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!myRow || !form || isReviewMode) return;
    if (!window.confirm("응답을 철회하시겠습니까?")) return;

    try {
      await AltSheetRowAPI.DAltSheetRow({ params: { _id: myRow._id } });
      setMyRow(null);
      setMyRows([]);
      setData(withDocResponseDefaults(form.fields));
      setIsSubmitted(false);
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

      case "docResponse": {
        const docValue = data[field._id] ?? field.content ?? "";
        if (disabled) {
          return (
            <div className={style.contentFieldBody}>
              <MarkdownViewer content={docValue} />
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

        const formattedDate = value
          ? new Date(value + "T00:00:00").toLocaleDateString("ko-KR", {
              year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
            })
          : "";

        return (
          <div>
            <div style={{ position: "relative" }}>
              <input
                className={style.textInput}
                type="date"
                value={value}
                min={effectiveMin}
                max={effectiveMax}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={disabled || isDateDisabled}
                style={value ? { color: "transparent" } : undefined}
              />
              {value && (
                <span
                  style={{
                    position: "absolute", left: "12px", top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                    fontSize: "14px", color: "var(--primary-text-color)",
                  }}
                >
                  {formattedDate}
                </span>
              )}
            </div>
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
          <input
            className={style.textInput}
            type="time"
            value={value}
            onChange={(e) => setValue(field._id, e.target.value)}
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
          <div>
            {field.options?.map((opt, i) => (
              <label key={i} className={style.choiceOption}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue(field._id, [...selected, opt]);
                    } else {
                      setValue(
                        field._id,
                        selected.filter((s) => s !== opt)
                      );
                    }
                  }}
                  disabled={disabled}
                />
                {opt}
              </label>
            ))}
          </div>
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

        // 제출 후·개별 보기: 결재 진행 상태
        if ((isSubmitted || isReviewMode) && approvalData) {
          const statusStyles: Record<string, string> = {
            pending: style.badgePending,
            approved: style.badgeApproved,
            rejected: style.badgeRejected,
            waiting: style.badgeClosed,
          };
          const statusLabels: Record<string, string> = {
            pending: "대기",
            approved: "승인",
            rejected: "반려",
            waiting: "대기전",
          };
          const hasStepReason = approvalData.steps.some((s) => s.reason);

          return (
            <div className={style.approvalStatus}>
              <div className={style.approvalStepBadges}>
                {approvalData.steps.map((s, i) => (
                  <div key={i} className={style.approvalStepBadgeGroup}>
                    <span
                      className={`${style.approvalBadge} ${
                        statusStyles[s.status] || ""
                      }`}
                      title={
                        s.approver
                          ? `${s.approver.userName} (${s.approver.userId})`
                          : undefined
                      }
                    >
                      {s.label}: {statusLabels[s.status] || s.status}
                      {s.approver ? ` · ${s.approver.userName}` : ""}
                    </span>
                    {s.reason && (
                      <div className={style.approvalStepReason}>
                        의견: {s.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!hasStepReason && approvalData.reason && (
                <div className={style.approvalStepReason}>
                  의견: {approvalData.reason}
                </div>
              )}
            </div>
          );
        }

        // 제출 전: pick 단계만 승인자 선택
        const pickSteps = lineSteps.filter((s) => s.mode === "pick");
        const writerUsers = board.writers?.users || [];

        if (pickSteps.length === 0) {
          return (
            <div className={style.userSelectContainer}>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-color-2)",
                }}
              >
                결재선:{" "}
                {lineSteps
                  .map(
                    (s) =>
                      `${s.label}(${s.approver?.userName || "고정"})`
                  )
                  .join(" → ")}
              </span>
            </div>
          );
        }

        // 저장 형식: v2 steps with pick approvers filled; fixed filled from field
        const currentPicks: Record<number, any> = {};
        if (value?.version === 2 && Array.isArray(value.steps)) {
          value.steps.forEach((s: any, i: number) => {
            if (s?.mode === "pick" && s.approver) currentPicks[i] = s.approver;
          });
        } else if (value?.approver && pickSteps.length === 1) {
          currentPicks[0] = value.approver;
        }

        const buildValueFromPicks = (picks: Record<number, any>) => {
          let pickIdx = 0;
          const steps = lineSteps.map((def) => {
            const approver =
              def.mode === "fixed"
                ? def.approver
                : picks[pickIdx++];
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
          };
        };

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginBottom: "8px",
              }}
            >
              결재:{" "}
              {lineSteps
                .map((s) =>
                  s.mode === "fixed"
                    ? `${s.label}(${s.approver?.userName || "고정"})`
                    : `${s.label}(지정)`
                )
                .join(" → ")}
            </div>
            {pickSteps.map((ps, pickIndex) => {
              const selected = currentPicks[pickIndex];
              const queryKey = `${field._id}_pick_${pickIndex}`;
              const approverQuery = userSearchQuery[queryKey] || "";
              const approverCandidates = approverQuery.trim()
                ? writerUsers.filter(
                    (u) =>
                      u.userName.includes(approverQuery) ||
                      u.userId
                        .toLowerCase()
                        .includes(approverQuery.toLowerCase())
                  )
                : [];

              return (
                <div
                  key={pickIndex}
                  className={style.userSelectContainer}
                  style={{ marginBottom: "10px" }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-color-2)",
                      marginBottom: "4px",
                      display: "block",
                    }}
                  >
                    {ps.label} 승인자 선택
                  </span>
                  {selected?.userName ? (
                    <div className={style.userSelectSelected}>
                      <span>
                        {selected.userName} ({selected.userId})
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          className={style.removeBtn}
                          onClick={() => {
                            const next = { ...currentPicks };
                            delete next[pickIndex];
                            setValue(field._id, buildValueFromPicks(next));
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
                        value={approverQuery}
                        onChange={(e) =>
                          setUserSearchQuery((p) => ({
                            ...p,
                            [queryKey]: e.target.value,
                          }))
                        }
                        disabled={disabled}
                      />
                      {approverCandidates.length > 0 && (
                        <div className={style.userSearchDropdown}>
                          {approverCandidates.map((u) => (
                            <div
                              key={u.user}
                              className={style.userSearchItem}
                              onClick={() => {
                                const next = {
                                  ...currentPicks,
                                  [pickIndex]: {
                                    user: u.user,
                                    userId: u.userId,
                                    userName: u.userName,
                                  },
                                };
                                setValue(
                                  field._id,
                                  buildValueFromPicks(next)
                                );
                                setUserSearchQuery((p) => ({
                                  ...p,
                                  [queryKey]: "",
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
            })}
          </div>
        );
      }

      case "file": {
        const files: { originalName: string; key: string }[] = Array.isArray(
          value
        )
          ? value
          : [];
        const isUploading = uploadingFields[field._id] || false;

        const handleFileDownload = async (f: {
          originalName: string;
          key: string;
        }) => {
          try {
            const { preSignedUrl } = await FileAPI.RSignedUrlDocument({
              query: { key: f.key, fileName: f.originalName },
            });
            const anchor = document.createElement("a");
            anchor.href = preSignedUrl;
            anchor.download = f.originalName;
            anchor.click();
          } catch (err) {
            ALERT_ERROR(err);
          }
        };

        const handleFileSelect = async (file: File) => {
          if (file.size > 20 * 1024 * 1024) {
            alert(`${file.name}: 파일 크기는 20MB 이하여야 합니다.`);
            return;
          }
          setUploadingFields((p) => ({ ...p, [field._id]: true }));
          try {
            const formData = new FormData();
            formData.append("file", file);
            const result = await FileAPI.CUploadFileArchive({
              data: formData,
            });
            setValue(field._id, [
              ...files,
              { originalName: result.originalName, key: result.key },
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

        return (
          <div className={style.fileUploadArea}>
            {files.map((f) => (
              <div key={f.key} className={style.uploadedFile}>
                <span
                  className={`${style.uploadedFileName} ${
                    disabled ? style.uploadedFileLink : ""
                  }`}
                  onClick={disabled ? () => handleFileDownload(f) : undefined}
                  role={disabled ? "button" : undefined}
                  tabIndex={disabled ? 0 : undefined}
                  onKeyDown={
                    disabled
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ")
                            handleFileDownload(f);
                        }
                      : undefined
                  }
                >
                  {f.originalName}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className={style.fileRemoveBtn}
                    onClick={() =>
                      setValue(
                        field._id,
                        files.filter((x) => x.key !== f.key)
                      )
                    }
                    aria-label={`${f.originalName} 삭제`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

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
                    {files.length > 0 && ` · ${files.length}개 첨부됨`}
                  </span>
                </div>
              </>
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
                {linkData.ogImage && (
                  <img
                    src={linkData.ogImage}
                    alt=""
                    className={style.linkPreviewImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
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
                  : `필수 제출 ${Math.min(myRows.length, requiredTarget)}/${requiredTarget}`
              }
            >
              {Math.min(myRows.length, requiredTarget)}/{requiredTarget}
            </span>
          )}
        </div>
        {canShowOwnResponses && (
          <div className={style.viewModeToggle}>
            <button
              type="button"
              className={`${style.viewModeBtn} ${
                viewMode === "compose" ? style.viewModeBtnActive : ""
              }`}
              onClick={() => switchViewMode("compose")}
              disabled={multipleQuotaReached}
              title={
                multipleQuotaReached
                  ? "목표 제출 횟수를 모두 채웠습니다."
                  : undefined
              }
            >
              작성
            </button>
            <button
              type="button"
              className={`${style.viewModeBtn} ${
                viewMode === "review" ? style.viewModeBtnActive : ""
              }`}
              onClick={() => switchViewMode("review")}
            >
              내 응답
            </button>
          </div>
        )}
      </div>

      <div className={style.rendererBody}>
      {/* 양식 정보 — 활동 양식 빌더 titleCard와 동일 톤 */}
      <div className={style.rendererHeader}>
        <div className={style.rendererHeaderBody}>
          <span className={style.titleCardEyebrow}>양식 정보</span>
          <h2 className={style.rendererTitle}>{form.title}</h2>
          {form.description?.trim() &&
            form.description.trim() !== form.title?.trim() && (
              <p className={style.rendererDesc}>{form.description}</p>
            )}
        </div>
      </div>

      {(isClosed ||
        isNotOpen ||
        (!isReviewMode && isSubmitted) ||
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
          {!isReviewMode && isSubmitted && (
            <span className={`${style.formCardBadge} ${style.badgeOpen}`}>
              응답 완료
            </span>
          )}
          {isReviewMode && (
            <span className={`${style.formCardBadge} ${style.badgeSubmitted}`}>
              개별 보기
            </span>
          )}
        </div>
      )}

      {isReviewMode && myRows.length > 0 && (
        <div className={style.reviewNav}>
          <button
            type="button"
            className={style.reviewNavBtn}
            disabled={reviewIndex <= 0}
            onClick={() => goReview(reviewIndex - 1)}
            title="이전 응답"
          >
            <Svg type="chevronLeft" width="18px" height="18px" />
          </button>
          <span className={style.reviewNavCount}>
            {reviewIndex + 1} / {myRows.length}
          </span>
          <button
            type="button"
            className={style.reviewNavBtn}
            disabled={reviewIndex >= myRows.length - 1}
            onClick={() => goReview(reviewIndex + 1)}
            title="다음 응답"
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
      {assessmentFinalized && activeRow?.data?._assessment && (
        <div className={style.quizScoreBanner}>
          <div className={style.quizScoreText}>
            <strong>평가 결과</strong>
            {(form?.settings.assessmentSettings?.finalEvaluation?.mode ===
              "score_only" ||
              form?.settings.assessmentSettings?.finalEvaluation?.mode ===
                "both") &&
              activeRow.data._assessment.final?.max != null && (
                <span>
                  {" "}
                  {activeRow.data._assessment.final.score ?? 0} /{" "}
                  {activeRow.data._assessment.final.max}점
                </span>
              )}
            {activeRow.data._assessment.final?.comment && (
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {activeRow.data._assessment.final.comment}
              </div>
            )}
            {Object.entries(
              (activeRow.data._assessment as TAssessmentData).byField || {}
            ).map(([fid, g]: [string, TAssessmentFieldGrade]) => {
                const field = form?.fields.find((f) => f._id === fid);
                const byRubric = g?.byRubric || {};
                const entries = Object.entries(byRubric).filter(
                  ([, rg]: [string, TAssessmentFieldRubricGrade]) =>
                    !!rg?.levelLabel
                );
                if (!entries.length && !g?.levelLabel && !g?.comment) {
                  return null;
                }
                return (
                  <div
                    key={fid}
                    style={{ marginTop: 6, fontSize: 12, opacity: 0.95 }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {field?.label || "항목"}
                      {g?.score != null && g?.max != null
                        ? ` · ${g.score}/${g.max}점`
                        : ""}
                    </div>
                    {entries.map(([rid, rg]) => {
                      const rubric = form?.rubrics?.find((r) => r.id === rid);
                      return (
                        <div key={rid}>
                          {rubric?.title ? `${rubric.title}: ` : ""}
                          {rg.levelLabel}
                          {rg.score != null ? ` (${rg.score}점)` : ""}
                        </div>
                      );
                    })}
                    {!entries.length && g?.levelLabel && (
                      <div>{g.levelLabel}</div>
                    )}
                    {g?.comment && <div>{g.comment}</div>}
                  </div>
                );
              })}
          </div>
        </div>
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

      {/* 개별 보기: 읽기 전용 배너 */}
      {isReviewMode && (
        <div className={style.readonlyBanner}>
          <div className={style.readonlyBannerText}>
            <strong>응답은 수정할 수 없습니다.</strong>
            {reviewSubmittedAt && <span>제출일: {reviewSubmittedAt}</span>}
          </div>
        </div>
      )}

      {/* 제출 완료 배너 (작성 모드) */}
      {!isReviewMode &&
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
      {(!isSubmitted || canResubmit || form?.settings.showOwnResponse !== false || quizScoreVisible || assessmentFinalized || assessmentPending || isReviewMode) &&
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
                  <MarkdownViewer content={field.content || ""} />
                </div>
              </div>
            );
          }

          const disabled =
            isReviewMode || (isSubmitted && !canResubmit) || !canSubmit;
          const quizMark = getQuizMark(field);

          return (
            <div
              key={field._id}
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

      {/* 제출/수정 버튼 */}
      {!isReviewMode && (
        <div className={style.submitArea}>
          {isSubmitted &&
            myRow &&
            canSubmit &&
            !form?.settings.allowMultipleResponses && (
              <Button type="ghost" onClick={handleWithdraw}>
                응답 철회
              </Button>
            )}
          {(!isSubmitted || canResubmit) &&
            canSubmit &&
            (!form?.settings.allowMultipleResponses || canComposeMultiple) && (
            <Button
              type="ghost"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "제출 중..."
                : (() => {
                    const base = isSubmitted
                      ? form?.settings.allowMultipleResponses
                        ? "추가 제출"
                        : "수정 제출"
                      : "제출";
                    if (requiredTarget == null || !canComposeMultiple) {
                      return base;
                    }
                    return `${base} (${myRows.length}/${requiredTarget})`;
                  })()}
            </Button>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default AltFormRenderer;
