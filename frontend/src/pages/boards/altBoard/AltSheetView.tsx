import { useEffect, useMemo, useRef, useState } from "react";
import style from "./altBoard.module.scss";
import { TAltForm, TAltFormField, TAssessmentData } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import useOutsideClick from "hooks/useOutsideClick";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Svg from "assets/svg/Svg";
import { MarkdownEditor, MarkdownViewer } from "components/markdown";
import { isCurrentApprover, normalizeApprovalValue } from "utils/approvalLine";
import { NO_PRINT_CLASS, printArea } from "utils/printArea";
import RecordsListFilterBar, {
  TRecordsViewCounts,
  TRecordsViewFilter,
} from "./RecordsListFilterBar";
import SheetDetailFilterBar, {
  TSheetColumnChip,
} from "./SheetDetailFilterBar";
import SheetTimetableView, {
  getTimetableAxisFields,
} from "./SheetTimetableView";
import SheetSummaryView from "./SheetSummaryView";
import SheetApprovalDocSection from "./SheetApprovalDocSection";
import SheetAssessmentSection from "./SheetAssessmentSection";
import FieldAssessmentInline, {
  TGradeDraft,
} from "./FieldAssessmentInline";
import useRegisterAlterAssessmentGrade from "hooks/useRegisterAlterAssessmentGrade";
import useRegisterAlterSnapshot from "hooks/useRegisterAlterSnapshot";
import FilePreviewModal from "./FilePreviewModal";
import FormFileAnswerList from "./FormFileAnswerList";
import { TFormFileRef } from "./formFilePreview";
import { buildSheetChatSnapshot } from "utils/alterChatSnapshot";
import {
  fileAnswerLabel,
  isFileAnswerFile,
  isFileAnswerLink,
  linkDisplayTitle,
  sanitizeHttpUrl,
} from "./formDocLink";

type Props = {
  forms: TAltForm[];
  canManage: boolean;
  canDeleteAnyRow: boolean;
  /** 양식별 기록 전체 보기. 없으면 canManage */
  canViewAllRowsForForm?: (form: TAltForm) => boolean;
  initialFormId?: string;
  onFormSelect?: (formId: string) => void;
  onFormDeselect?: () => void;
  onCopySheetLink?: (formId: string) => void;
  /** 기록 열람 후 목록 unreadResponseCount 낙관적 갱신 */
  onUnreadCleared?: (formId: string) => void;
  boardName?: string;
};

type SortConfig = {
  fieldId: string;
  direction: "asc" | "desc";
} | null;

type TSheetViewMode = "table" | "doc" | "timetable" | "summary";

const SHEET_VIEW_MODES: TSheetViewMode[] = [
  "table",
  "doc",
  "timetable",
  "summary",
];

const formSupportsTimetable = (form: TAltForm | undefined) => {
  if (!form) return false;
  const { dateFields, periodFields } = getTimetableAxisFields(
    form.fields || []
  );
  return dateFields.length > 0 && periodFields.length > 0;
};

const readStoredViewMode = (formId: string): TSheetViewMode | null => {
  try {
    const stored = localStorage.getItem(`altSheet_${formId}_viewMode`);
    if (stored && SHEET_VIEW_MODES.includes(stored as TSheetViewMode)) {
      return stored as TSheetViewMode;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const writeStoredViewMode = (formId: string, mode: TSheetViewMode) => {
  try {
    localStorage.setItem(`altSheet_${formId}_viewMode`, mode);
  } catch {
    /* ignore */
  }
};

const resolveViewMode = (
  formId: string,
  form: TAltForm | undefined,
  mode?: TSheetViewMode
): TSheetViewMode => {
  const next = mode ?? readStoredViewMode(formId) ?? "doc";
  if (next === "timetable" && !formSupportsTimetable(form)) return "doc";
  return next;
};

const formMatchesKeyword = (form: TAltForm, keyword: string) => {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  return (
    (form.title || "").toLowerCase().includes(kw) ||
    (form.description || "").toLowerCase().includes(kw)
  );
};

const formMatchesRecordsFilter = (
  form: TAltForm,
  filter: Exclude<TRecordsViewFilter, "">
) => {
  if (filter === "shared") return !!form.settings.shareResponses;
  if (filter === "quiz") return !!form.settings.quizMode;
  if (filter === "assessment") return !!form.settings.assessmentMode;
  if (filter === "approval")
    return form.fields.some((f) => f.type === "approval");
  if (filter === "direct") return !!form.settings.directInputMode;
  return true;
};

const AltSheetView = ({
  forms,
  canManage,
  canDeleteAnyRow,
  canViewAllRowsForForm,
  initialFormId,
  onFormSelect,
  onFormDeselect,
  onCopySheetLink,
  onUnreadCleared,
  boardName,
}: Props) => {
  const { AltFormAPI, AltSheetRowAPI, PostAPI } = useAPIv2();
  const { currentUser } = useAuth();

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

  const [selectedFormId, setSelectedFormId] = useState<string>(
    initialFormId || ""
  );
  const [rows, setRows] = useState<TAltSheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const markedOpenRef = useRef<string | null>(null);

  // 시트 상세 진입 시 열람 시각 기록 (unread 기준점)
  useEffect(() => {
    if (!selectedFormId) {
      markedOpenRef.current = null;
      return;
    }
    const opened = forms.find((f) => f._id === selectedFormId);
    if (!(opened ? canViewAllRowsForForm?.(opened) ?? canManage : canManage)) {
      return;
    }
    if (markedOpenRef.current === selectedFormId) return;
    markedOpenRef.current = selectedFormId;
    onUnreadCleared?.(selectedFormId);
    AltFormAPI.UAltFormSheetOpened({ params: { _id: selectedFormId } }).catch(
      () => {
        /* 열람 기록 실패해도 시트 조회는 유지 */
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useAPIv2 refs unstable
  }, [selectedFormId, canManage]);

  // 인라인 편집 상태
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    fieldId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // 검색·정렬·표시 항목
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // 승인 사유 입력
  const [approvalReason, setApprovalReason] = useState<
    Record<string, string>
  >({});

  // 뷰 모드: 테이블 / 문서 / 시간표 (양식별 localStorage 기억)
  const [viewMode, setViewMode] = useState<TSheetViewMode>(() => {
    if (!initialFormId) return "doc";
    const form = forms.find((f) => f._id === initialFormId);
    return resolveViewMode(initialFormId, form);
  });

  const viewModeMenu = useOutsideClick();
  const moreMenu = useOutsideClick();
  const csvFileRef = useRef<HTMLInputElement>(null);
  const applyViewMode = (formId: string, mode: TSheetViewMode) => {
    setViewMode(mode);
    writeStoredViewMode(formId, mode);
  };

  const openForm = (formId: string, mode?: TSheetViewMode) => {
    const form = forms.find((f) => f._id === formId);
    const resolved = resolveViewMode(formId, form, mode);
    applyViewMode(formId, resolved);
    setSelectedFormId(formId);
    onFormSelect?.(formId);
  };

  // 문서 뷰 편집 상태
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [docEditData, setDocEditData] = useState<Record<string, any>>({});
  /** 문서 보기: 필터된 행 기준 현재 index */
  const [docIndex, setDocIndex] = useState(0);
  /** 문서 보기: 키워드 검색 (머지 UI와 동일) */
  const [docKeyword, setDocKeyword] = useState("");
  /** 기록 목록: 검색·칩 필터 */
  const [recordsKeyword, setRecordsKeyword] = useState("");
  const [recordsFilter, setRecordsFilter] = useState<TRecordsViewFilter>("");

  // 응답 삭제 확인
  const [deleteTargetRow, setDeleteTargetRow] = useState<TAltSheetRow | null>(
    null
  );
  const [isDeletingRow, setIsDeletingRow] = useState(false);

  /** 인쇄: printArea로 현재 보기 영역만 격리 */
  const listPrintRootRef = useRef<HTMLDivElement>(null);
  const docPrintRootRef = useRef<HTMLDivElement>(null);
  const tablePrintRootRef = useRef<HTMLDivElement>(null);
  const timetablePrintRootRef = useRef<HTMLDivElement>(null);
  const summaryPrintRootRef = useRef<HTMLDivElement>(null);
  const docBatchPrintRootRef = useRef<HTMLDivElement>(null);
  /** 문서 보기 일괄 인쇄: DOM 마운트 후 print */
  const [docBatchPrintActive, setDocBatchPrintActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<TFormFileRef | null>(null);

  const selectedForm = forms.find((f) => f._id === selectedFormId);
  const formAllowsAllRows = (form: TAltForm) =>
    canViewAllRowsForForm?.(form) ?? canManage;
  const canManageSelected = selectedForm
    ? formAllowsAllRows(selectedForm)
    : canManage;

  const handleSheetPrint = () => {
    if (!selectedFormId) {
      printArea(listPrintRootRef.current);
      return;
    }
    if (viewMode === "doc") {
      printArea(docPrintRootRef.current);
      return;
    }
    if (viewMode === "timetable") {
      printArea(timetablePrintRootRef.current);
      return;
    }
    if (viewMode === "summary") {
      printArea(summaryPrintRootRef.current);
      return;
    }
    // 테이블: 조회된(필터·정렬) 전체
    printArea(tablePrintRootRef.current);
  };

  // 표시할 필드: 문서(content) 제외. 관리자는 전체, 응답자는 respondent + visibleToRespondent
  const allVisibleFields: TAltFormField[] = selectedForm
    ? (canManageSelected
        ? selectedForm.fields
        : selectedForm.fields.filter(
            (f) =>
              f.permission === "respondent" ||
              (f.permission === "owner" &&
                (f.visibleToRespondent || selectedForm.settings.showOwnerFields))
          )
      ).filter((f) => f.type !== "content")
    : [];

  const visibleFields = allVisibleFields.filter(
    (f) => !hiddenColumns.has(f._id)
  );
  const contentFields = visibleFields.filter((f) => f.type !== "approval");
  const approvalFields = visibleFields.filter((f) => f.type === "approval");

  // 퀴즈 모드 여부
  const isQuiz = selectedForm?.settings.quizMode;
  const isAssessment = !!selectedForm?.settings.assessmentMode;

  const supportsTimetable = useMemo(
    () => formSupportsTimetable(selectedForm),
    [selectedForm]
  );

  useEffect(() => {
    if (!supportsTimetable && viewMode === "timetable") {
      setViewMode("doc");
      if (selectedFormId) writeStoredViewMode(selectedFormId, "doc");
    }
  }, [supportsTimetable, viewMode, selectedFormId]);

  // 평가 채점 초안 (문서 보기)
  const [gradeDraft, setGradeDraft] = useState<TGradeDraft>({
    byField: {},
    final: {},
  });
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // 양식 전환 시 검색·정렬·표시 항목 복원/초기화
  useEffect(() => {
    if (!selectedFormId) return;
    const stored = localStorage.getItem(
      `altSheet_${selectedFormId}_hiddenColumns`
    );
    if (stored) {
      try {
        setHiddenColumns(new Set(JSON.parse(stored)));
      } catch {
        setHiddenColumns(new Set());
      }
    } else {
      setHiddenColumns(new Set());
    }
    setSortConfig(null);
    setDocKeyword("");
  }, [selectedFormId]);

  useEffect(() => {
    if (!selectedFormId) return;
    localStorage.setItem(
      `altSheet_${selectedFormId}_hiddenColumns`,
      JSON.stringify(Array.from(hiddenColumns))
    );
  }, [hiddenColumns, selectedFormId]);

  useEffect(() => {
    if (!selectedFormId) return;
    setIsLoading(true);
    AltSheetRowAPI.RAltSheetRows({ query: { form: selectedFormId } })
      .then(({ rows: loadedRows }) => {
        setRows(loadedRows);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  }, [selectedFormId]);

  const truncatePreview = (text: string, max = 80): string => {
    const plain = text.replace(/\s+/g, " ").trim();
    if (plain.length <= max) return plain;
    return `${plain.slice(0, max)}…`;
  };

  /** CSV 내보내기용: base64 등 무거운 데이터 제거, 가독 가능한 텍스트 유지 */
  const sanitizeForCsvExport = (value: string): string => {
    let text = value;

    // 마크다운 이미지(data URI)
    text = text.replace(/!\[[^\]]*\]\(data:[^)]+\)/g, "[이미지]");
    // 마크다운 링크(data URI)
    text = text.replace(/\[[^\]]*\]\(data:[^)]+\)/g, "[첨부데이터]");
    // HTML img(data URI)
    text = text.replace(
      /<img\b[^>]*\bsrc=["']data:[^"']+["'][^>]*>/gi,
      "[이미지]"
    );
    // HTML table → 탭 구분 텍스트
    text = text.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, tableHtml) => {
      const rows: string[] = [];
      for (const rowMatch of tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
        const cells: string[] = [];
        for (const cellMatch of rowMatch[1].matchAll(
          /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi
        )) {
          cells.push(
            cellMatch[1]
              .replace(/<[^>]+>/g, " ")
              .replace(/[^\S\n]+/g, " ")
              .trim()
          );
        }
        if (cells.length > 0) rows.push(cells.join("\t"));
      }
      return rows.join("\n");
    });
    // 남은 HTML 태그 제거(내용은 유지)
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/?(p|div|h[1-6]|li|blockquote)[^>]*>/gi, "\n");
    text = text.replace(/<[^>]+>/g, "");

    // 노출된 data URI blob
    text = text.replace(/data:image\/[^;,\s]+;[^,\s"')]+,[^)\s"'>]+/gi, "[이미지]");
    text = text.replace(/data:[^;,\s]+;[^,\s"')]+,[^)\s"'>]+/gi, "[첨부데이터]");

    // 같은 줄 공백 정리, 과도한 빈 줄만 축소(의도적 줄바꿈은 유지)
    text = text.replace(/[^\S\n]+/g, " ");
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
  };

  const formatCellValue = (value: any, field?: TAltFormField): string => {
    if (value === null || value === undefined) return "";

    if (field?.type === "userSelect" && typeof value === "object") {
      return value.userName
        ? `${value.userName}(${value.userId || ""})`
        : "";
    }

    if (field?.type === "approval" && typeof value === "object") {
      const overall = value.overallStatus || value.status || "";
      const statusLabels: Record<string, string> = {
        pending: "대기",
        approved: "승인",
        rejected: "반려",
      };
      if (value.version === 2 && Array.isArray(value.steps)) {
        const parts = value.steps.map(
          (s: any) =>
            `${s.label}:${statusLabels[s.status] || s.status || ""}${
              s.approver?.userName ? `(${s.approver.userName})` : ""
            }`
        );
        return `${statusLabels[overall] || overall} | ${parts.join(" → ")}`;
      }
      const approverName = value.approver?.userName || "";
      return `${statusLabels[overall] || overall} (${approverName})`;
    }

    if (field?.type === "rating") {
      return value ? `${"★".repeat(Number(value))}` : "";
    }

    if (field?.type === "date" && value) {
      const d = new Date(value + "T00:00:00");
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("ko-KR", {
          year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
        });
      }
    }

    if (field?.type === "multiDate" && Array.isArray(value)) {
      const thisYear = new Date().getFullYear();
      return value
        .map((v: string) => {
          const d = new Date(v + "T00:00:00");
          if (!isNaN(d.getTime())) {
            const opts: Intl.DateTimeFormatOptions = {
              month: "2-digit", day: "2-digit", weekday: "short",
            };
            if (d.getFullYear() !== thisYear) {
              opts.year = "numeric";
            }
            return d.toLocaleDateString("ko-KR", opts);
          }
          return v;
        })
        .join(", ");
    }

    if (field?.type === "link" && typeof value === "object" && value?.url) {
      return value.title || value.ogTitle || value.url;
    }

    if (field?.type === "file" && Array.isArray(value)) {
      return value.map((f: any) => fileAnswerLabel(f)).filter(Boolean).join(", ");
    }

    if (field?.type === "time" && value) {
      return value;
    }

    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Y" : "N";
    return String(value);
  };

  // CSV 내보내기용: 날짜/복수만 원본 유지, 나머지는 기존 화면 포맷
  const exportCellValue = (value: any, field?: TAltFormField): string => {
    if (value === null || value === undefined) return "";
    if (field?.type === "multiDate" && Array.isArray(value)) {
      return value.join(",");
    }
    if (field?.type === "date") {
      return value ? String(value) : "";
    }
    if (
      (field?.type === "multiSelect" || field?.type === "checkbox") &&
      Array.isArray(value)
    ) {
      return value.join(",");
    }
    const formatted = formatCellValue(value, field);
    if (
      field?.type === "docResponse" ||
      field?.type === "textarea" ||
      field?.type === "content"
    ) {
      return sanitizeForCsvExport(formatted);
    }
    return formatted;
  };

  const docKeywordPlaceholder = useMemo(() => {
    const labels = allVisibleFields.slice(0, 3).map((f) => f.label);
    if (labels.length === 0) return "키워드 검색 (응답자, 내용)";
    return `키워드 검색 (${labels.join(", ")} 등)`;
  }, [allVisibleFields]);

  const clearSearchAndSort = () => {
    setDocKeyword("");
    setSortConfig(null);
  };

  const toggleColumnVisibility = (fieldId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  const showAllColumns = () => setHiddenColumns(new Set());

  const showRespondentCol = !hiddenColumns.has("_respondent");
  const showSubmittedAtCol = !hiddenColumns.has("_submittedAt");

  const columnChips: TSheetColumnChip[] = useMemo(
    () => [
      { fieldId: "_respondent", label: "응답자" },
      ...allVisibleFields.map((f) => ({
        fieldId: f._id,
        label: f.label,
      })),
      { fieldId: "_submittedAt", label: "제출일" },
    ],
    [allVisibleFields]
  );

  const sortFieldOptions = useMemo(() => {
    const options: { fieldId: string; label: string }[] = [
      { fieldId: "_respondent", label: "응답자" },
      ...allVisibleFields.map((f) => ({ fieldId: f._id, label: f.label })),
    ];
    if (isQuiz) {
      options.push({ fieldId: "_quiz_score", label: "점수" });
    }
    options.push({ fieldId: "_submittedAt", label: "제출일" });
    return options;
  }, [allVisibleFields, isQuiz]);

  /** 키워드 검색 적용 */
  const keywordRows = useMemo(() => {
    const kw = docKeyword.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter((row) => {
      if ((row._respondentName || "").toLowerCase().includes(kw)) return true;
      if ((row._respondentId || "").toLowerCase().includes(kw)) return true;
      if (row._submittedAt) {
        const submittedRaw = String(row._submittedAt).toLowerCase();
        if (submittedRaw.includes(kw)) return true;
        const submittedLabel = new Date(row._submittedAt)
          .toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
          .toLowerCase();
        if (submittedLabel.includes(kw)) return true;
      }
      for (const field of allVisibleFields) {
        const cellValue = row.data[field._id];
        if (cellValue === null || cellValue === undefined) continue;
        if (
          String(formatCellValue(cellValue, field))
            .toLowerCase()
            .includes(kw)
        ) {
          return true;
        }
      }
      return false;
    });
  }, [rows, docKeyword, allVisibleFields]);

  // 검색·정렬된 행 (표시 칩은 컬럼만 제어)
  const filteredRows = useMemo(() => {
    let result = keywordRows;

    if (sortConfig) {
      const { fieldId, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (fieldId === "_respondent") {
          aVal = a._respondentName || "";
          bVal = b._respondentName || "";
        } else if (fieldId === "_submittedAt") {
          aVal = a._submittedAt || "";
          bVal = b._submittedAt || "";
        } else if (fieldId === "_quiz_score") {
          aVal = a.data?._quiz_score ?? -1;
          bVal = b.data?._quiz_score ?? -1;
        } else {
          const field = allVisibleFields.find((f) => f._id === fieldId);
          aVal = a.data[fieldId];
          bVal = b.data[fieldId];
          if (field?.type === "approval") {
            aVal = normalizeApprovalValue(aVal, field)?.overallStatus || "";
            bVal = normalizeApprovalValue(bVal, field)?.overallStatus || "";
          } else {
            if (Array.isArray(aVal)) aVal = aVal.join(",");
            if (Array.isArray(bVal)) bVal = bVal.join(",");
          }
          aVal = aVal ?? "";
          bVal = bVal ?? "";
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal), "ko");
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [keywordRows, sortConfig, allVisibleFields]);

  const handleDocBatchPrint = () => {
    if (filteredRows.length === 0) {
      window.alert("인쇄할 응답이 없습니다.");
      return;
    }
    if (
      filteredRows.length > 30 &&
      !window.confirm(
        `필터된 응답 ${filteredRows.length}건을 일괄 인쇄합니다. 계속할까요?`
      )
    ) {
      return;
    }
    setDocBatchPrintActive(true);
  };

  // 문서 보기 일괄 인쇄: 필터된 응답 DOM 마운트 후 printArea
  useEffect(() => {
    if (!docBatchPrintActive) return;
    const frame = requestAnimationFrame(() => {
      printArea(docBatchPrintRootRef.current, {
        onComplete: () => setDocBatchPrintActive(false),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [docBatchPrintActive]);

  // 문서 보기 index를 필터 결과에 맞게 유지
  useEffect(() => {
    if (filteredRows.length === 0) {
      setDocIndex(0);
      return;
    }
    setDocIndex((prev) => Math.min(Math.max(0, prev), filteredRows.length - 1));
  }, [filteredRows.length, rows.length, sortConfig, docKeyword]);

  // 폼 변경 시 문서 index 초기화
  useEffect(() => {
    setDocIndex(0);
    setEditingRowId(null);
    setDocEditData({});
  }, [selectedFormId]);

  const currentDocRowId = filteredRows[docIndex]?._id ?? null;

  // 문서 보기에서 행·모드 전환 시 편집 모드 종료
  useEffect(() => {
    setEditingRowId(null);
    setDocEditData({});
  }, [currentDocRowId, viewMode]);

  const currentDocRow = filteredRows[docIndex] ?? null;

  const inAssessmentGradeMode =
    !!canManageSelected &&
    !!isAssessment &&
    viewMode === "doc" &&
    !!selectedForm &&
    !!currentDocRow;

  useRegisterAlterSnapshot({
    enabled: !!selectedForm && !inAssessmentGradeMode,
    pageType: "sheet",
    label: selectedForm
      ? `${boardName ? `${boardName} · ` : ""}${selectedForm.title || "응답 기록"}`
      : "응답 기록",
    boardName,
    getChatSnapshot: (opts) => {
      if (!selectedForm) return null;
      return buildSheetChatSnapshot({
        formTitle: selectedForm.title,
        viewMode,
        fields: visibleFields.map((f) => ({
          _id: f._id,
          label: f.label,
          type: f.type,
        })),
        rows: filteredRows,
        totalRowCount: rows.length,
        dataExpand: opts?.dataExpand,
      });
    },
  });

  useRegisterAlterAssessmentGrade({
    enabled: inAssessmentGradeMode,
    form: selectedForm,
    row: currentDocRow,
    gradeDraft,
    setGradeDraft,
    boardName,
  });

  // 문서 행 변경 시 채점 초안 동기화
  useEffect(() => {
    if (!currentDocRow || !isAssessment) {
      setGradeDraft({ byField: {}, final: {} });
      return;
    }
    const a = (currentDocRow.data?._assessment || {}) as TAssessmentData;
    const byField: TGradeDraft["byField"] = {};
    for (const [fid, g] of Object.entries(a.byField || {})) {
      const byRubric: Record<string, { levelId?: string; comment?: string }> =
        {};
      for (const [rid, rg] of Object.entries(g.byRubric || {})) {
        byRubric[rid] = {
          levelId: rg.levelId,
          comment: rg.comment,
        };
      }
      byField[fid] = {
        score: g.score,
        levelId: g.levelId,
        comment: g.comment,
        byRubric: Object.keys(byRubric).length ? byRubric : undefined,
      };
    }
    setGradeDraft({
      byField,
      final: {
        comment: a.final?.comment,
      },
    });
  }, [currentDocRowId, isAssessment, currentDocRow?.data?._assessment]);

  const saveAssessmentGrade = async (opts?: {
    finalize?: boolean;
    unfinalize?: boolean;
  }) => {
    if (!currentDocRow || !canManageSelected) return;
    setIsSavingGrade(true);
    try {
      const { row } = await AltSheetRowAPI.UAltSheetRowAssessment({
        params: { _id: currentDocRow._id },
        data: {
          byField: gradeDraft.byField,
          final: gradeDraft.final,
          finalize: opts?.finalize,
          unfinalize: opts?.unfinalize,
        },
      });
      setRows((prev) =>
        prev.map((r) => (r._id === row._id ? row : r))
      );
      if (opts?.finalize) {
        alert("평가가 확정되었습니다. 학생이 결과를 볼 수 있습니다.");
      } else if (opts?.unfinalize) {
        alert("확정이 취소되었습니다. 학생에게는 결과가 숨겨집니다.");
      } else {
        alert("채점이 저장되었습니다. (초안 — 학생에게 아직 공개되지 않습니다)");
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSavingGrade(false);
    }
  };

  const assessmentStatusOf = (row: TAltSheetRow) => {
    const status = row.data?._assessment?.final?.status;
    if (status === "finalized") return "확정";
    if (row.data?._assessment) return "채점 대기";
    return "";
  };

  const handleSortFieldChange = (fieldId: string) => {
    if (!fieldId) {
      setSortConfig(null);
      return;
    }
    setSortConfig((prev) => ({
      fieldId,
      direction: prev?.fieldId === fieldId ? prev.direction : "asc",
    }));
  };

  const toggleSortDirection = () => {
    setSortConfig((prev) =>
      prev
        ? {
            fieldId: prev.fieldId,
            direction: prev.direction === "asc" ? "desc" : "asc",
          }
        : null
    );
  };

  /** 잘린 셀 전체 내용 미리보기 */
  const [cellPreview, setCellPreview] = useState<{
    text: string;
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const openCellPreview = (
    el: HTMLElement,
    text: string,
    force = false
  ) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const overflowed =
      el.scrollWidth > el.clientWidth + 1 ||
      el.scrollHeight > el.clientHeight + 1;
    if (!force && !overflowed && trimmed.length < 40) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 260), 420);
    const left = Math.min(
      rect.left,
      Math.max(8, window.innerWidth - width - 8)
    );
    setCellPreview({
      text: trimmed,
      top: rect.bottom + 4,
      left,
      width,
    });
  };

  const handleCellClick = (
    rowId: string,
    field: TAltFormField,
    currentValue: string
  ) => {
    if (!canDeleteAnyRow) return;
    // 복합 타입은 텍스트 입력으로 편집 불가 (데이터 손상 방지)
    const nonEditableTypes = [
      "multiDate", "multiSelect", "userSelect", "file", "link",
      "checkbox", "rating", "scale", "counter", "approval", "content",
    ];
    if (nonEditableTypes.includes(field.type)) return;
    setEditingCell({ rowId, fieldId: field._id });
    // date는 표시용 포맷이 아니라 YYYY-MM-DD 원본을 편집
    setEditValue(currentValue || "");
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    try {
      await AltSheetRowAPI.UAltSheetRow({
        params: { _id: editingCell.rowId },
        data: { data: { [editingCell.fieldId]: editValue } },
      });
      setRows((prev) =>
        prev.map((r) =>
          r._id === editingCell.rowId
            ? {
                ...r,
                data: { ...r.data, [editingCell.fieldId]: editValue },
              }
            : r
        )
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // 관리자 빈 행 추가 (Bulk API 사용 — 응답 중복 체크 우회)
  const handleAddRow = async () => {
    if (!selectedForm) return;
    try {
      const emptyData: Record<string, any> = {};
      for (const field of selectedForm.fields) {
        emptyData[field._id] = null;
      }
      const { rows: newRows } = await AltSheetRowAPI.CAltSheetRowsBulk({
        data: {
          form: selectedForm._id,
          rows: [
            {
              _respondent: currentUser?._id,
              _respondentId: currentUser?.userId,
              _respondentName: currentUser?.userName,
              data: emptyData,
            },
          ],
        },
      });
      if (newRows.length > 0) {
        setRows((prev) => [...prev, newRows[0]]);
      }
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 승인/반려 처리
  const handleApproval = async (
    rowId: string,
    fieldId: string,
    status: "approved" | "rejected"
  ) => {
    const reason = approvalReason[`${rowId}_${fieldId}`] || "";
    try {
      const { row } = await AltSheetRowAPI.UAltSheetRow({
        params: { _id: rowId },
        data: {
          data: {
            [fieldId]: {
              status,
              reason,
            },
          },
        },
      });
      setRows((prev) =>
        prev.map((r) => (r._id === rowId ? { ...r, data: row.data } : r))
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 행 삭제 확인 요청
  const requestDeleteRow = (row: TAltSheetRow) => {
    setDeleteTargetRow(row);
  };

  // 행 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!deleteTargetRow || isDeletingRow) return;
    const rowId = deleteTargetRow._id;
    setIsDeletingRow(true);
    try {
      await AltSheetRowAPI.DAltSheetRow({ params: { _id: rowId } });
      setRows((prev) => prev.filter((r) => r._id !== rowId));
      if (editingRowId === rowId) {
        setEditingRowId(null);
        setDocEditData({});
      }
      setDeleteTargetRow(null);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsDeletingRow(false);
    }
  };

  // CSV 다운로드 (BOM 포함으로 한글 Excel 호환)
  const handleCsvDownload = () => {
    if (!selectedForm || filteredRows.length === 0) return;

    const headers = ["#", "응답자"];
    for (const field of visibleFields) headers.push(field.label);
    if (isQuiz) { headers.push("점수"); headers.push("총점"); }
    if (isAssessment) { headers.push("평가상태"); }
    headers.push("제출일");

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const lines = [headers.map(escapeCsv).join(",")];
    for (let i = 0; i < filteredRows.length; i++) {
      const row = filteredRows[i];
      const cells: string[] = [
        String(i + 1),
        row._respondentName
          ? `${row._respondentName}(${row._respondentId || ""})`
          : "",
      ];
      for (const field of visibleFields) {
        // 메일머지/재가져오기용: 날짜·복수는 원본 값으로보냄 (화면용 포맷 금지)
        cells.push(exportCellValue(row.data[field._id], field));
      }
      if (isQuiz) {
        cells.push(row.data?._quiz_score != null ? String(row.data._quiz_score) : "");
        cells.push(row.data?._quiz_total != null ? String(row.data._quiz_total) : "");
      }
      if (isAssessment) {
        cells.push(assessmentStatusOf(row));
      }
      cells.push(
        row._submittedAt
          ? new Date(row._submittedAt).toLocaleString("ko-KR", {
              year: "numeric", month: "2-digit", day: "2-digit",
              weekday: "short", hour: "2-digit", minute: "2-digit",
            })
          : ""
      );
      lines.push(cells.map(escapeCsv).join(","));
    }

    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedForm.title}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // CSV 업로드
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedForm) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        alert("CSV 파일에 데이터가 없습니다.");
        return;
      }

      // 헤더 파싱
      const headers = parseCsvLine(lines[0]);
      const dataRows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const obj: Record<string, any> = {};
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j].trim();
          if (header && header !== "#" && header !== "응답자" && header !== "제출일") {
            obj[header] = values[j]?.trim() ?? "";
          }
        }
        if (Object.keys(obj).length > 0) {
          dataRows.push(obj);
        }
      }

      if (dataRows.length === 0) {
        alert("가져올 데이터가 없습니다.");
        return;
      }

      try {
        const { rows: newRows, created } =
          await AltSheetRowAPI.CAltSheetRowImportCsv({
            data: { form: selectedForm._id, rows: dataRows },
          });
        setRows((prev) => [...prev, ...newRows]);
        alert(`${created}개 행을 가져왔습니다.`);
      } catch (err) {
        ALERT_ERROR(err);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  // CSV 라인 파싱 (쌍따옴표 처리)
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  };

  // 승인 필드인지 + 현재 사용자가 승인자인지 판별
  const isApproverForField = (row: TAltSheetRow, field: TAltFormField) => {
    if (field.type !== "approval") return false;
    return isCurrentApprover(
      row.data[field._id],
      currentUser?.userId,
      field
    );
  };

  // 승인 필드 셀 렌더링
  const renderApprovalCell = (row: TAltSheetRow, field: TAltFormField) => {
    const approvalData = normalizeApprovalValue(row.data[field._id], field);
    if (!approvalData) return "-";

    const status = approvalData.overallStatus || "pending";
    const isApprover = isApproverForField(row, field);
    const statusClass =
      status === "approved"
        ? style.badgeApproved
        : status === "rejected"
          ? style.badgeRejected
          : style.badgePending;
    const current = approvalData.steps[approvalData.currentStep];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {approvalData.steps.map((s, i) => (
            <span
              key={i}
              className={`${style.approvalBadge} ${
                s.status === "approved"
                  ? style.badgeApproved
                  : s.status === "rejected"
                    ? style.badgeRejected
                    : s.status === "pending"
                      ? style.badgePending
                      : style.badgeClosed
              }`}
              style={{ fontSize: "10px", padding: "1px 5px" }}
            >
              {s.label}
              {s.approver ? `·${s.approver.userName}` : ""}
            </span>
          ))}
        </div>
        <span
          className={`${style.approvalBadge} ${statusClass}`}
          style={{ fontSize: "11px", padding: "1px 6px" }}
        >
          {status === "approved"
            ? "최종 승인"
            : status === "rejected"
              ? "반려"
              : current
                ? `${current.label} 대기`
                : "대기"}
        </span>
        {isApprover && status === "pending" && (
          <div
            className={`${style.noPrint} ${NO_PRINT_CLASS}`}
            style={{ display: "flex", gap: "4px", flexDirection: "column" }}
          >
            <input
              className={style.cellInput}
              placeholder="사유 (선택)"
              value={approvalReason[`${row._id}_${field._id}`] || ""}
              onChange={(e) =>
                setApprovalReason((p) => ({
                  ...p,
                  [`${row._id}_${field._id}`]: e.target.value,
                }))
              }
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: "11px", minWidth: "60px" }}
            />
            <div style={{ display: "flex", gap: "2px" }}>
              <button
                className={style.approvalActionBtn}
                style={{
                  color: "var(--status-success)",
                  background: "var(--status-success-bg)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproval(row._id, field._id, "approved");
                }}
              >
                승인
              </button>
              <button
                className={style.approvalActionBtn}
                style={{
                  color: "var(--status-error)",
                  background: "var(--status-error-bg)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproval(row._id, field._id, "rejected");
                }}
              >
                반려
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 문서 뷰: 편집 불가 필드 타입 (기존 handleCellClick과 동일)
  const nonEditableTypes = [
    "multiDate", "multiSelect", "userSelect", "file", "link",
    "checkbox", "rating", "scale", "counter", "approval", "content",
  ];

  // 문서 뷰: 행 수정 가능 여부
  const canEditRowDoc = (row: TAltSheetRow) => {
    if (canDeleteAnyRow) return true;
    if (
      row._respondent === currentUser?._id &&
      selectedForm?.settings?.allowResubmit
    )
      return true;
    return false;
  };

  // 문서 뷰: 편집 시작
  const handleDocEditStart = (row: TAltSheetRow) => {
    setEditingRowId(row._id);
    setDocEditData({ ...row.data });
  };

  // 문서 뷰: 저장
  const handleDocEditSave = async () => {
    if (!editingRowId) return;
    try {
      // 편집 가능한 필드만 추출
      const editableData: Record<string, any> = {};
      for (const field of allVisibleFields) {
        if (!nonEditableTypes.includes(field.type)) {
          if (
            !canDeleteAnyRow &&
            field.permission === "owner"
          )
            continue;
          editableData[field._id] = docEditData[field._id];
        }
      }
      await AltSheetRowAPI.UAltSheetRow({
        params: { _id: editingRowId },
        data: { data: editableData },
      });
      setRows((prev) =>
        prev.map((r) =>
          r._id === editingRowId
            ? { ...r, data: { ...r.data, ...editableData } }
            : r
        )
      );
      setEditingRowId(null);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 문서 뷰: 필드 값 렌더링
  const renderDocFieldValue = (
    row: TAltSheetRow,
    field: TAltFormField,
    isEditing: boolean
  ) => {
    const value = isEditing ? docEditData[field._id] : row.data[field._id];
    const canEditField =
      isEditing && !nonEditableTypes.includes(field.type) &&
      (canDeleteAnyRow || field.permission === "respondent");

    // 편집 모드: 입력 필드 렌더링
    if (canEditField) {
      switch (field.type) {
        case "textarea":
          return (
            <textarea
              className={style.docViewTextarea}
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
              rows={4}
            />
          );
        case "docResponse":
          return (
            <div className={style.docResponseField}>
              <MarkdownEditor
                value={value ?? ""}
                onChange={(md) =>
                  setDocEditData((p) => ({ ...p, [field._id]: md }))
                }
                placeholder="응답 문서를 편집하세요."
                minHeight="200px"
                onImageUpload={handleEditorImageUpload}
              />
            </div>
          );
        case "number":
          return (
            <input
              className={style.docViewInput}
              type="number"
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            />
          );
        case "date":
          return (
            <input
              className={style.docViewInput}
              type="date"
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            />
          );
        case "time":
          return (
            <input
              className={style.docViewInput}
              type="time"
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            />
          );
        case "select":
        case "radio":
          return (
            <select
              className={style.docViewInput}
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            >
              <option value="">선택하세요</option>
              {field.options?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          );
        default: // text
          return (
            <input
              className={style.docViewInput}
              value={value ?? ""}
              onChange={(e) =>
                setDocEditData((p) => ({ ...p, [field._id]: e.target.value }))
              }
            />
          );
      }
    }

    // 읽기 전용 렌더링
    if (value === null || value === undefined || value === "") {
      return <span style={{ color: "var(--text-color-2)", fontStyle: "italic" }}>—</span>;
    }

    if (field.type === "textarea") {
      return (
        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}>
          {String(value)}
        </div>
      );
    }

    if (field.type === "docResponse") {
      return (
        <div className={style.contentFieldBody}>
          <MarkdownViewer content={String(value)} />
        </div>
      );
    }

    if (field.type === "file" && Array.isArray(value)) {
      return (
        <FormFileAnswerList items={value} onPreview={setPreviewFile} />
      );
    }

    if (field.type === "link" && typeof value === "object" && value?.url) {
      return (
        <a
          href={value.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            gap: "10px",
            textDecoration: "none",
            color: "inherit",
            padding: "8px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            background: "var(--bg-color-2)",
          }}
        >
          {value.ogImage && (
            <img
              src={value.ogImage}
              alt=""
              style={{
                width: "60px",
                height: "60px",
                objectFit: "cover",
                borderRadius: "4px",
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--accent-1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value.title || value.ogTitle || value.url}
            </div>
            {value.ogDescription && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--text-color-2)",
                  marginTop: "2px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {value.ogDescription}
              </div>
            )}
            <div style={{ fontSize: "11px", color: "var(--text-color-3)", marginTop: "2px" }}>
              {(() => {
                try { return new URL(value.url).hostname; } catch { return value.url; }
              })()}
            </div>
          </div>
        </a>
      );
    }

    if (field.type === "rating") {
      return <span style={{ fontSize: "18px" }}>{"★".repeat(Number(value))}</span>;
    }

    return formatCellValue(value, field);
  };

  // 응답자: shareResponses(전체 공유) 또는 showOwnResponse(본인 기록) 켜진 양식
  const availableForms = useMemo(
    () =>
      forms.filter(
        (f) =>
          formAllowsAllRows(f) ||
          f.settings.shareResponses ||
          f.settings.showOwnResponse
      ),
    [forms, canManage, canViewAllRowsForForm]
  );

  const keywordForms = useMemo(
    () =>
      availableForms.filter((f) => formMatchesKeyword(f, recordsKeyword)),
    [availableForms, recordsKeyword]
  );

  const filteredForms = useMemo(() => {
    if (!recordsFilter) return keywordForms;
    return keywordForms.filter((f) =>
      formMatchesRecordsFilter(f, recordsFilter)
    );
  }, [keywordForms, recordsFilter]);

  const recordsCounts: TRecordsViewCounts = useMemo(() => {
    const counts = {
      shared: 0,
      quiz: 0,
      assessment: 0,
      approval: 0,
      direct: 0,
    };
    for (const f of keywordForms) {
      if (formMatchesRecordsFilter(f, "shared")) counts.shared += 1;
      if (formMatchesRecordsFilter(f, "quiz")) counts.quiz += 1;
      if (formMatchesRecordsFilter(f, "assessment")) counts.assessment += 1;
      if (formMatchesRecordsFilter(f, "approval")) counts.approval += 1;
      if (formMatchesRecordsFilter(f, "direct")) counts.direct += 1;
    }
    return counts;
  }, [keywordForms]);

  const sharedCount = filteredForms.filter(
    (f) => f.settings.shareResponses
  ).length;
  const responseSum = filteredForms.reduce(
    (sum, f) => sum + (f.responseCount ?? 0),
    0
  );
  const hasRecordsFilters = !!recordsKeyword.trim() || !!recordsFilter;
  const clearRecordsFilters = () => {
    setRecordsKeyword("");
    setRecordsFilter("");
  };

  if (availableForms.length === 0) {
    return (
      <div className={style.formList}>
        <section className={style.formSectionPanel}>
          <div className={style.formSectionHeaderStatic}>
            <div className={style.formSectionHeaderMain}>
              <h3 className={style.formSectionTitle}>기록</h3>
              <span className={style.formSectionCount}>0</span>
            </div>
          </div>
          <div className={style.formSectionBody}>
            <div className={style.emptyState}>
              {canManage
                ? "양식을 먼저 생성해주세요."
                : "공개된 기록이 없습니다."}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // 시트 목록 (양식 미선택 시)
  if (!selectedFormId) {
    return (
      <div className={style.formList}>
        <div className={`${style.noPrint} ${NO_PRINT_CLASS}`}>
          <RecordsListFilterBar
            keyword={recordsKeyword}
            onKeywordChange={setRecordsKeyword}
            viewFilter={recordsFilter}
            onViewFilterChange={setRecordsFilter}
            counts={recordsCounts}
            onClear={clearRecordsFilters}
          />
        </div>
        <section className={style.formSectionPanel}>
          <div
            className={`${style.formSectionHeaderStatic} ${style.noPrint} ${NO_PRINT_CLASS}`}
          >
            <div className={style.formSectionHeaderMain}>
              <h3 className={style.formSectionTitle}>기록</h3>
              <span className={style.formSectionCount}>
                {filteredForms.length}
              </span>
            </div>
            <div className={style.formSectionStats}>
              {sharedCount > 0 && (
                <span>
                  공유 <strong>{sharedCount}</strong>
                </span>
              )}
              <span>
                총 응답 <strong>{responseSum}</strong>
              </span>
              <button
                type="button"
                className={style.formCardIconBtn}
                title="인쇄"
                aria-label="인쇄"
                onClick={handleSheetPrint}
              >
                <Svg type="print" width="18px" height="18px" />
              </button>
            </div>
          </div>
          <div ref={listPrintRootRef} className={style.formSectionBody}>
            <div className={style.printTitle}>기록</div>
            {filteredForms.length === 0 ? (
              <div className={style.emptyState}>
                {hasRecordsFilters
                  ? "조건에 맞는 기록이 없습니다."
                  : "기록이 없습니다."}
              </div>
            ) : (
              <div className={style.formCardList}>
                {filteredForms.map((form) => {
                  const canTimetable = formSupportsTimetable(form);
                  return (
                  <div
                    key={form._id}
                    className={style.formCard}
                    title="기록 열기"
                    onClick={() => openForm(form._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openForm(form._id);
                      }
                    }}
                  >
                    <div className={style.formCardMain}>
                      <div
                        className={`${style.formCardLeadIcon} ${
                          form.settings.shareResponses
                            ? style.formCardLeadIconInfo
                            : ""
                        }`}
                        aria-hidden
                      >
                        <Svg type="table" width="20px" height="20px" />
                      </div>
                      <div className={style.formCardLeft}>
                        <div className={style.formCardTitle}>{form.title}</div>
                        <div className={style.formCardMeta}>
                          <span>
                            {
                              form.fields.filter((f) => f.type !== "content")
                                .length
                            }
                            개 항목
                          </span>
                          {(form.responseCount ?? 0) > 0 && (
                            <span className={style.responseCount}>
                              {form.settings.allowMultipleResponses
                                ? `응답 ${form.responseCount}건`
                                : `제출 ${form.responseCount}명`}
                            </span>
                          )}
                          {form.settings.shareResponses && (
                            <span
                              className={style.formCardBadge}
                              style={{
                                background: "var(--status-info-bg)",
                                color: "var(--status-info)",
                              }}
                            >
                              공유
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`${style.formCardRight} ${style.noPrint} ${NO_PRINT_CLASS}`}
                    >
                      <button
                        type="button"
                        className={style.formCardIconBtn}
                        title="테이블 보기"
                        aria-label={
                          (form.unreadResponseCount ?? 0) > 0
                            ? `테이블 보기, 미확인 응답 ${form.unreadResponseCount}건`
                            : "테이블 보기"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          openForm(form._id, "table");
                        }}
                      >
                        <Svg type="table" width="20px" height="20px" />
                        {formAllowsAllRows(form) && (form.unreadResponseCount ?? 0) > 0 && (
                          <span className={style.formCardIconUnreadBadge}>
                            {(form.unreadResponseCount ?? 0) > 99
                              ? "99+"
                              : form.unreadResponseCount}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className={style.formCardIconBtn}
                        title="문서 보기"
                        aria-label="문서 보기"
                        onClick={(e) => {
                          e.stopPropagation();
                          openForm(form._id, "doc");
                        }}
                      >
                        <Svg type="article" width="20px" height="20px" />
                      </button>
                      {canTimetable && (
                        <button
                          type="button"
                          className={style.formCardIconBtn}
                          title="시간표 보기"
                          aria-label="시간표 보기"
                          onClick={(e) => {
                            e.stopPropagation();
                            openForm(form._id, "timetable");
                          }}
                        >
                          <Svg type="calender" width="20px" height="20px" />
                        </button>
                      )}
                      {onCopySheetLink && (
                        <button
                          type="button"
                          className={style.formCardIconBtn}
                          title="링크 복사"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopySheetLink(form._id);
                          }}
                        >
                          <Svg type="link" width="20px" height="20px" />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  const submissionSummary = isLoading
    ? "로딩 중..."
    : (() => {
        const uniqueUsers = new Set(
          filteredRows.map((r) => r._respondent).filter(Boolean)
        ).size;
        const totalUniqueUsers = new Set(
          rows.map((r) => r._respondent).filter(Boolean)
        ).size;
        const userLabel = `${uniqueUsers}명 제출`;
        const filtered =
          filteredRows.length !== rows.length
            ? ` (전체 ${totalUniqueUsers}명)`
            : "";
        const rowExtra =
          filteredRows.length !== uniqueUsers
            ? ` · ${filteredRows.length}개 응답`
            : "";
        return userLabel + filtered + rowExtra;
      })();

  return (
    <div className={style.sheetContainer}>
      {/* 헤더: 양식 관리와 동일한 서식 */}
      <div className={style.sheetHeader}>
        <div className={style.builderHeaderLeft}>
          <button
            type="button"
            className={`${style.backBtn} ${style.noPrint} ${NO_PRINT_CLASS}`}
            title="목록"
            onClick={() => {
              setSelectedFormId("");
              setRows([]);
              setHiddenColumns(new Set());
              setSortConfig(null);
              setDocKeyword("");
              onFormDeselect?.();
            }}
          >
            <Svg type="chevronLeft" width="20px" height="20px" />
          </button>
          <div className={style.sheetHeaderTitleWrap}>
            <span className={style.sheetHeaderTitle}>
              {selectedForm?.title || "기록"}
            </span>
            <span className={style.sheetCount}>{submissionSummary}</span>
          </div>
        </div>
        <div
          className={`${style.builderHeaderActions} ${style.noPrint} ${NO_PRINT_CLASS}`}
        >
          <div className={style.sheetMenuWrap} ref={viewModeMenu.RefObject}>
            <button
              type="button"
              className={`${style.formCardIconBtn} ${
                viewModeMenu.active ? style.formCardIconBtnActive : ""
              }`}
              title="보기 모드"
              aria-label="보기 모드"
              aria-expanded={viewModeMenu.active}
              aria-haspopup="menu"
              onClick={() => {
                moreMenu.setActive(false);
                viewModeMenu.setActive(!viewModeMenu.active);
              }}
            >
              <Svg
                type={
                  viewMode === "table"
                    ? "table"
                    : viewMode === "timetable"
                      ? "calender"
                      : viewMode === "summary"
                        ? "analyze"
                        : "article"
                }
                width="20px"
                height="20px"
              />
            </button>
            {viewModeMenu.active && (
              <div className={style.formActionMenu} role="menu">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={viewMode === "doc"}
                  className={`${style.formActionItem} ${
                    viewMode === "doc" ? style.formActionItemActive : ""
                  }`}
                  onClick={() => {
                    applyViewMode(selectedFormId, "doc");
                    viewModeMenu.setActive(false);
                  }}
                >
                  <Svg type="article" width="16px" height="16px" />
                  문서 보기
                </button>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={viewMode === "table"}
                  className={`${style.formActionItem} ${
                    viewMode === "table" ? style.formActionItemActive : ""
                  }`}
                  onClick={() => {
                    applyViewMode(selectedFormId, "table");
                    viewModeMenu.setActive(false);
                  }}
                >
                  <Svg type="table" width="16px" height="16px" />
                  테이블 보기
                </button>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={viewMode === "summary"}
                  className={`${style.formActionItem} ${
                    viewMode === "summary" ? style.formActionItemActive : ""
                  }`}
                  onClick={() => {
                    applyViewMode(selectedFormId, "summary");
                    viewModeMenu.setActive(false);
                  }}
                >
                  <Svg type="analyze" width="16px" height="16px" />
                  요약 보기
                </button>
                {supportsTimetable && (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === "timetable"}
                    className={`${style.formActionItem} ${
                      viewMode === "timetable"
                        ? style.formActionItemActive
                        : ""
                    }`}
                    onClick={() => {
                      applyViewMode(selectedFormId, "timetable");
                      viewModeMenu.setActive(false);
                    }}
                  >
                    <Svg type="calender" width="16px" height="16px" />
                    시간표 보기
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={style.sheetMenuWrap} ref={moreMenu.RefObject}>
            <button
              type="button"
              className={`${style.formCardIconBtn} ${
                moreMenu.active ? style.formCardIconBtnActive : ""
              }`}
              title="더보기"
              aria-label="더보기"
              aria-expanded={moreMenu.active}
              aria-haspopup="menu"
              onClick={() => {
                viewModeMenu.setActive(false);
                moreMenu.setActive(!moreMenu.active);
              }}
            >
              <Svg type="verticalDots" width="18px" height="18px" />
            </button>
            {moreMenu.active && (
              <div className={style.formActionMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={style.formActionItem}
                  onClick={() => {
                    handleSheetPrint();
                    moreMenu.setActive(false);
                  }}
                >
                  <Svg type="print" width="16px" height="16px" />
                  인쇄
                </button>
                {viewMode === "doc" && (
                  <button
                    type="button"
                    role="menuitem"
                    className={style.formActionItem}
                    onClick={() => {
                      handleDocBatchPrint();
                      moreMenu.setActive(false);
                    }}
                  >
                    <Svg type="print" width="16px" height="16px" />
                    일괄 인쇄
                  </button>
                )}
                {onCopySheetLink && (
                  <button
                    type="button"
                    role="menuitem"
                    className={style.formActionItem}
                    onClick={() => {
                      onCopySheetLink(selectedFormId);
                      moreMenu.setActive(false);
                    }}
                  >
                    <Svg type="link" width="16px" height="16px" />
                    링크 복사
                  </button>
                )}
                {canManageSelected && viewMode !== "timetable" && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      className={style.formActionItem}
                      onClick={() => {
                        handleAddRow();
                        moreMenu.setActive(false);
                      }}
                    >
                      <Svg type="plus" width="16px" height="16px" />
                      행 추가
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={style.formActionItem}
                      onClick={() => {
                        handleCsvDownload();
                        moreMenu.setActive(false);
                      }}
                    >
                      <Svg type="download" width="16px" height="16px" />
                      CSV 다운로드
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={style.formActionItem}
                      onClick={() => {
                        csvFileRef.current?.click();
                        moreMenu.setActive(false);
                      }}
                    >
                      <Svg type="upload" width="16px" height="16px" />
                      CSV 업로드
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleCsvUpload}
          />
        </div>
      </div>

      {/* 공통 검색·표시 항목·정렬 (모든 뷰모드) */}
      <div
        className={`${style.sheetFilterToolbar} ${style.noPrint} ${NO_PRINT_CLASS}`}
      >
        <SheetDetailFilterBar
          keyword={docKeyword}
          onKeywordChange={setDocKeyword}
          keywordPlaceholder={docKeywordPlaceholder}
          columns={columnChips}
          hiddenColumns={hiddenColumns}
          onToggleColumn={toggleColumnVisibility}
          onShowAllColumns={showAllColumns}
          onClearSearchAndSort={clearSearchAndSort}
          hasSearchOrSort={!!docKeyword.trim() || !!sortConfig}
          sortSlot={
            <div className={style.sheetSortControls}>
              <label className={style.sheetSortLabel} htmlFor="sheet-sort-field">
                정렬
              </label>
              <select
                id="sheet-sort-field"
                className={style.sheetSortSelect}
                value={sortConfig?.fieldId || ""}
                onChange={(e) => handleSortFieldChange(e.target.value)}
              >
                <option value="">없음</option>
                {sortFieldOptions.map((opt) => (
                  <option key={opt.fieldId} value={opt.fieldId}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`${style.sheetSortDirBtn} ${
                  sortConfig?.direction !== "desc" ? style.sheetSortDirAsc : ""
                }`}
                title={
                  sortConfig?.direction === "desc" ? "내림차순" : "오름차순"
                }
                aria-label={
                  sortConfig?.direction === "desc" ? "내림차순" : "오름차순"
                }
                disabled={!sortConfig}
                onClick={toggleSortDirection}
              >
                <Svg type="caretDown" width="16px" height="16px" />
              </button>
            </div>
          }
        />
      </div>

      {/* 콘텐츠 */}
      {!isLoading && rows.length === 0 ? (
        <div className={style.sheetEmpty}>아직 응답이 없습니다.</div>
      ) : !isLoading && viewMode === "timetable" && selectedForm ? (
        <SheetTimetableView
          formId={selectedFormId}
          rows={filteredRows}
          fields={
            hiddenColumns.size === 0
              ? selectedForm.fields
              : selectedForm.fields.filter(
                  (f) => f.type === "content" || !hiddenColumns.has(f._id)
                )
          }
          printRootRef={timetablePrintRootRef}
          printTitle={selectedForm?.title || "기록"}
          onOpenRow={(rowId) => {
            const idx = filteredRows.findIndex((r) => r._id === rowId);
            if (idx >= 0) {
              setDocIndex(idx);
              applyViewMode(selectedFormId, "doc");
            }
          }}
        />
      ) : !isLoading && viewMode === "summary" && selectedForm ? (
        <SheetSummaryView
          form={selectedForm}
          rows={filteredRows}
          visibleFields={visibleFields}
          canManage={canManageSelected}
          printRootRef={summaryPrintRootRef}
          printTitle={selectedForm.title || "요약"}
        />
      ) : !isLoading && viewMode === "doc" ? (
        /* ── 문서 뷰 (양식형 개별 보기) ── */
        <div className={style.docViewSingle}>
          {filteredRows.length === 0 || !currentDocRow ? (
            <div className={style.sheetEmpty}>표시할 응답이 없습니다.</div>
          ) : (
            <>
              <div
                className={`${style.reviewNav} ${style.noPrint} ${NO_PRINT_CLASS}`}
              >
                <button
                  type="button"
                  className={style.reviewNavBtn}
                  disabled={docIndex <= 0}
                  onClick={() => setDocIndex((i) => Math.max(0, i - 1))}
                  title="이전 응답"
                >
                  <Svg type="chevronLeft" width="18px" height="18px" />
                </button>
                <span className={style.reviewNavCount}>
                  {docIndex + 1} / {filteredRows.length}
                </span>
                <button
                  type="button"
                  className={style.reviewNavBtn}
                  disabled={docIndex >= filteredRows.length - 1}
                  onClick={() =>
                    setDocIndex((i) =>
                      Math.min(filteredRows.length - 1, i + 1)
                    )
                  }
                  title="다음 응답"
                >
                  <Svg type="chevronRight" width="18px" height="18px" />
                </button>
              </div>

              <div ref={docPrintRootRef}>
                <div className={style.printTitle}>
                  {selectedForm?.title || "기록"}
                </div>
                <div className={style.docViewCardHeader}>
                  <div>
                    {showRespondentCol ? (
                      <>
                        <span style={{ fontWeight: 600 }}>
                          {currentDocRow._respondentName || "응답자"}
                        </span>
                        {currentDocRow._respondentId && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-color-2)",
                              marginLeft: "4px",
                            }}
                          >
                            ({currentDocRow._respondentId})
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontWeight: 600 }}>응답</span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    {showSubmittedAtCol && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-color-2)",
                        }}
                      >
                        {currentDocRow._submittedAt
                          ? new Date(currentDocRow._submittedAt).toLocaleString(
                              "ko-KR",
                              {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                weekday: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "-"}
                      </span>
                    )}
                    <span className={`${style.noPrint} ${NO_PRINT_CLASS}`}>
                      {canEditRowDoc(currentDocRow) &&
                        editingRowId !== currentDocRow._id && (
                          <button
                            type="button"
                            className={style.formCardIconBtn}
                            title="수정"
                            onClick={() => handleDocEditStart(currentDocRow)}
                          >
                            <Svg type="edit" width="18px" height="18px" />
                          </button>
                        )}
                      {editingRowId === currentDocRow._id && (
                        <>
                          <Button
                            type="ghost"
                            onClick={handleDocEditSave}
                            style={{ padding: "2px 8px", fontSize: "12px" }}
                          >
                            저장
                          </Button>
                          <Button
                            type="ghost"
                            onClick={() => setEditingRowId(null)}
                            style={{ padding: "2px 8px", fontSize: "12px" }}
                          >
                            취소
                          </Button>
                        </>
                      )}
                      {(canDeleteAnyRow ||
                        (currentDocRow._respondent === currentUser?._id &&
                          selectedForm?.settings?.allowResubmit)) && (
                        <button
                          className={style.removeBtn}
                          onClick={() => requestDeleteRow(currentDocRow)}
                          title="삭제"
                          style={{ opacity: 0.5 }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </div>
                </div>

                {isQuiz && currentDocRow.data?._quiz_score != null && (
                  <div className={style.quizScoreBanner}>
                    <div className={style.quizScoreText}>
                      <strong>
                        점수: {currentDocRow.data._quiz_score} /{" "}
                        {currentDocRow.data._quiz_total || 0}점
                      </strong>
                    </div>
                  </div>
                )}

                {contentFields.map((field) => {
                  const showAssessment =
                    isAssessment &&
                    selectedForm &&
                    !!field.gradingMethod &&
                    field.gradingMethod !== "none";
                  return (
                    <div key={field._id} className={style.questionItem}>
                      <div className={style.questionLabel}>
                        <span className={style.questionLabelText}>
                          {field.label}
                        </span>
                        {field.required && (
                          <span className={style.requiredMark}>*</span>
                        )}
                        {field.permission === "owner" && (
                          <span className={style.docViewOwnerBadge}>
                            (관리자)
                          </span>
                        )}
                      </div>
                      <div className={style.docViewValue}>
                        {renderDocFieldValue(
                          currentDocRow,
                          field,
                          editingRowId === currentDocRow._id
                        )}
                      </div>
                      {showAssessment && (
                        <FieldAssessmentInline
                          field={field}
                          form={selectedForm}
                          canManage={canManageSelected}
                          isEditingDoc={
                            editingRowId === currentDocRow._id
                          }
                          gradeDraft={gradeDraft}
                          setGradeDraft={setGradeDraft}
                          assessment={
                            (currentDocRow.data?._assessment ||
                              {}) as TAssessmentData
                          }
                        />
                      )}
                    </div>
                  );
                })}

                {approvalFields.map((field) => (
                  <SheetApprovalDocSection
                    key={field._id}
                    field={field}
                    row={currentDocRow}
                    currentUserId={currentUser?.userId}
                    reason={
                      approvalReason[`${currentDocRow._id}_${field._id}`] || ""
                    }
                    onReasonChange={(value) =>
                      setApprovalReason((p) => ({
                        ...p,
                        [`${currentDocRow._id}_${field._id}`]: value,
                      }))
                    }
                    onApprove={() =>
                      handleApproval(currentDocRow._id, field._id, "approved")
                    }
                    onReject={() =>
                      handleApproval(currentDocRow._id, field._id, "rejected")
                    }
                  />
                ))}

                {isAssessment && selectedForm && (
                  <SheetAssessmentSection
                    form={selectedForm}
                    row={currentDocRow}
                    canManage={canManageSelected}
                    gradeDraft={gradeDraft}
                    setGradeDraft={setGradeDraft}
                    isSavingGrade={isSavingGrade}
                    onSave={saveAssessmentGrade}
                  />
                )}
              </div>
            </>
          )}
        </div>
      ) : !isLoading ? (
        /* ── 테이블 뷰 ── */
        <div ref={tablePrintRootRef} className={style.sheetTableWrap}>
          <div className={style.printTitle}>
            {selectedForm?.title || "기록"}
          </div>
          <table className={style.sheetTable}>
            <colgroup>
              <col className={style.colRowNum} />
              {showRespondentCol && <col className={style.colRespondent} />}
              {visibleFields.map((f) => (
                <col
                  key={f._id}
                  className={
                    f.type === "multiDate" ||
                    f.type === "textarea" ||
                    f.type === "docResponse"
                      ? style.colWide
                      : style.colField
                  }
                />
              ))}
              {isQuiz && <col className={style.colQuiz} />}
              {isAssessment && <col className={style.colQuiz} />}
              {showSubmittedAtCol && <col className={style.colSubmitted} />}
              <col className={style.colAction} />
            </colgroup>
            <thead>
              <tr>
                <th className={style.rowNumCell}>#</th>
                {showRespondentCol && <th>응답자</th>}
                {visibleFields.map((f) => (
                  <th key={f._id}>
                    {f.label}
                    {f.permission === "owner" && (
                      <span className={style.sheetColOwnerBadge}>
                        (관리자)
                      </span>
                    )}
                  </th>
                ))}
                {isQuiz && <th>점수</th>}
                {isAssessment && <th>평가</th>}
                {showSubmittedAtCol && <th>제출일</th>}
                <th className={style.actionCell} />
              </tr>
            </thead>
            <tbody>
            {filteredRows.map((row, index) => (
              <tr key={row._id}>
                <td className={style.rowNumCell}>{index + 1}</td>
                {showRespondentCol && (
                <td
                  className={style.cellPreviewable}
                  onClick={(e) => {
                    const name = row._respondentName || "";
                    const id = row._respondentId
                      ? ` (${row._respondentId})`
                      : "";
                    openCellPreview(
                      e.currentTarget,
                      `${name}${id}`.trim()
                    );
                  }}
                >
                  {row._respondentName || ""}
                  {row._respondentId && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-color-2)",
                        marginLeft: "4px",
                      }}
                    >
                      ({row._respondentId})
                    </span>
                  )}
                </td>
                )}
                {visibleFields.map((field) => {
                  // 파일 필드 특별 렌더링
                  if (
                    field.type === "file" &&
                    Array.isArray(row.data[field._id])
                  ) {
                    return (
                      <td key={field._id}>
                        {(
                          row.data[field._id] as any[]
                        ).map((f, i) => {
                          if (isFileAnswerLink(f)) {
                            const href = sanitizeHttpUrl(f.url);
                            if (!href) return null;
                            return (
                              <a
                                key={`${href}-${i}`}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "var(--accent-1)",
                                  textDecoration: "underline",
                                  marginRight: "8px",
                                }}
                              >
                                {linkDisplayTitle({ ...f, url: href })}
                              </a>
                            );
                          }
                          if (!isFileAnswerFile(f)) return null;
                          return (
                          <span
                            key={f.key}
                            style={{
                              color: "var(--accent-1)",
                              textDecoration: "underline",
                              cursor: "pointer",
                              marginRight: "8px",
                            }}
                            onClick={() => setPreviewFile(f)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setPreviewFile(f);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {f.originalName}
                          </span>
                          );
                        })}
                      </td>
                    );
                  }

                  // 승인 필드 특별 렌더링
                  if (field.type === "approval") {
                    return (
                      <td key={field._id}>
                        {renderApprovalCell(row, field)}
                      </td>
                    );
                  }

                  const rawValue = row.data[field._id];
                  const cellValue = formatCellValue(rawValue, field);
                  const displayValue =
                    field.type === "docResponse" && cellValue
                      ? truncatePreview(cellValue)
                      : cellValue;
                  const isEditing =
                    editingCell?.rowId === row._id &&
                    editingCell?.fieldId === field._id;
                  const canEdit = canDeleteAnyRow;
                  const editSource =
                    field.type === "docResponse" || field.type === "date"
                      ? String(rawValue ?? "")
                      : cellValue;

                  const nonEditableTypes = [
                    "multiDate",
                    "multiSelect",
                    "userSelect",
                    "file",
                    "link",
                    "checkbox",
                    "rating",
                    "scale",
                    "counter",
                    "approval",
                    "content",
                  ];
                  const canInlineEdit =
                    canEdit && !nonEditableTypes.includes(field.type);

                  return (
                    <td
                      key={field._id}
                      onClick={(e) => {
                        if (isEditing) return;
                        if (canInlineEdit) {
                          handleCellClick(row._id, field, editSource);
                          return;
                        }
                        openCellPreview(
                          e.currentTarget,
                          cellValue,
                          field.type === "textarea" ||
                            field.type === "docResponse" ||
                            field.type === "multiDate"
                        );
                      }}
                      className={[
                        canInlineEdit ? style.cellEditable : "",
                        style.cellPreviewable,
                        field.type === "textarea" || field.type === "docResponse"
                          ? style.cellTextarea
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined}
                      title={cellValue || undefined}
                    >
                      {isEditing ? (
                        field.type === "textarea" ||
                        field.type === "docResponse" ? (
                          <textarea
                            className={style.cellInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            autoFocus
                            rows={4}
                            style={{ resize: "vertical", minHeight: "60px" }}
                          />
                        ) : (
                          <input
                            className={style.cellInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={handleCellKeyDown}
                            autoFocus
                          />
                        )
                      ) : (
                        displayValue || ""
                      )}
                    </td>
                  );
                })}
                {isQuiz && (
                  <td>
                    {row.data?._quiz_score != null
                      ? `${row.data._quiz_score} / ${row.data._quiz_total || 0}`
                      : "-"}
                  </td>
                )}
                {isAssessment && (
                  <td>{assessmentStatusOf(row) || "-"}</td>
                )}
                {showSubmittedAtCol && (
                <td>
                  {row._submittedAt
                    ? new Date(row._submittedAt).toLocaleString("ko-KR", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                        weekday: "short", hour: "2-digit", minute: "2-digit",
                      })
                    : "-"}
                </td>
                )}
                <td className={style.actionCell}>
                  {(canDeleteAnyRow ||
                    (row._respondent === currentUser?._id &&
                      selectedForm?.settings?.allowResubmit)) && (
                    <button
                      className={style.removeBtn}
                      onClick={() => requestDeleteRow(row)}
                      title="삭제"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {cellPreview && (
        <div
          className={style.cellPreviewOverlay}
          onClick={() => setCellPreview(null)}
        >
          <div
            className={style.cellPreviewPop}
            style={{
              top: cellPreview.top,
              left: cellPreview.left,
              width: cellPreview.width,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={style.cellPreviewText}>{cellPreview.text}</div>
            <button
              type="button"
              className={style.cellPreviewClose}
              onClick={() => setCellPreview(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {deleteTargetRow && (
        <Popup
          title="응답 삭제"
          setState={(v: boolean) => {
            if (!v && !isDeletingRow) setDeleteTargetRow(null);
          }}
          closeBtn={!isDeletingRow}
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
                onClick={() => setDeleteTargetRow(null)}
                disabled={isDeletingRow}
              >
                취소
              </Button>
              <Button
                type="ghost"
                onClick={handleDeleteConfirm}
                disabled={isDeletingRow}
                style={{ color: "var(--status-error)" }}
              >
                {isDeletingRow ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          }
        >
          <div style={{ padding: "8px 4px", lineHeight: 1.6 }}>
            <strong>{deleteTargetRow._respondentName || "응답자"}</strong>
            님의 응답을 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </div>
        </Popup>
      )}

      {/* 문서 보기 일괄 인쇄용 (화면 밖 마운트 → printArea) */}
      {docBatchPrintActive && (
        <div
          ref={docBatchPrintRootRef}
          className={style.docBatchPrintRoot}
          aria-hidden
        >
          {filteredRows.map((row, pageIndex) => (
            <div key={row._id} className={style.docBatchPrintPage}>
              <div className={style.printTitle}>
                {selectedForm?.title || "기록"}
                {filteredRows.length > 1
                  ? ` (${pageIndex + 1}/${filteredRows.length})`
                  : ""}
              </div>
              <div className={style.docViewCardHeader}>
                <div>
                  {showRespondentCol ? (
                    <>
                      <span style={{ fontWeight: 600 }}>
                        {row._respondentName || "응답자"}
                      </span>
                      {row._respondentId && (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-color-2)",
                            marginLeft: "4px",
                          }}
                        >
                          ({row._respondentId})
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontWeight: 600 }}>응답</span>
                  )}
                </div>
                {showSubmittedAtCol && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-color-2)",
                    }}
                  >
                    {row._submittedAt
                      ? new Date(row._submittedAt).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </span>
                )}
              </div>

              {isQuiz && row.data?._quiz_score != null && (
                <div className={style.quizScoreBanner}>
                  <div className={style.quizScoreText}>
                    <strong>
                      점수: {row.data._quiz_score} /{" "}
                      {row.data._quiz_total || 0}점
                    </strong>
                  </div>
                </div>
              )}

              {contentFields.map((field) => (
                <div key={field._id} className={style.questionItem}>
                  <div className={style.questionLabel}>
                    <span className={style.questionLabelText}>
                      {field.label}
                    </span>
                    {field.required && (
                      <span className={style.requiredMark}>*</span>
                    )}
                    {field.permission === "owner" && (
                      <span className={style.docViewOwnerBadge}>(관리자)</span>
                    )}
                  </div>
                  <div className={style.docViewValue}>
                    {renderDocFieldValue(row, field, false)}
                  </div>
                </div>
              ))}

              {approvalFields.map((field) => (
                <SheetApprovalDocSection
                  key={field._id}
                  field={field}
                  row={row}
                  currentUserId={currentUser?.userId}
                  reason=""
                  onReasonChange={() => {}}
                  onApprove={() => {}}
                  onReject={() => {}}
                />
              ))}

              {isAssessment && selectedForm && (
                <SheetAssessmentSection
                  form={selectedForm}
                  row={row}
                  canManage={false}
                  gradeDraft={{ byField: {}, final: {} }}
                  setGradeDraft={() => {}}
                  isSavingGrade={false}
                  onSave={() => {}}
                />
              )}
            </div>
          ))}
        </div>
      )}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};

export default AltSheetView;
