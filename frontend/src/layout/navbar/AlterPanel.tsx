import {
  ClipboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "contexts/authContext";
import { TAlterSkillId, useAlter } from "contexts/alterContext";
import { MESSAGE } from "hooks/_message";
import { isEmptyEval } from "utils/evaluationCsv";
import { TAlterConversation } from "types/alterChat";
import Button from "components/button/Button";
import { MarkdownViewer } from "components/markdown";
import normalizeAlterMarkdown from "utils/normalizeAlterMarkdown";
import Svg from "assets/svg/Svg";
import {
  ChatPanelShell,
  ChatPanelHeader,
  ChatEmptyState,
  ChatListRow,
  ChatMessageBubble,
  ChatInputBar,
  chatUiStyle,
} from "./chatUi";
import style from "./Alter.module.scss";

const formatAlterListTime = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

const alterApiBase = () => `${process.env.REACT_APP_SERVER_URL}/api/ai`;

type TAlterEvalDraftResult = {
  kind?: "evaluation";
  targetLabels: string[];
  fillEmptyOnly: boolean;
  csv: string;
  rows: Array<{
    studentId: string;
    studentName?: string;
    studentGrade?: string;
    values: Record<string, string>;
  }>;
};

type TAlterArchiveDraftResult = {
  kind: "archive";
  writeMode?: "perStudent" | "sameText";
  targetLabels: string[];
  fillEmptyOnly: boolean;
  rows: Array<{
    studentId: string;
    studentName?: string;
    studentGrade?: string;
    values: Record<string, string>;
  }>;
};

type TAlterDocumentDraftResult = {
  kind: "document";
  writeMode?: "create" | "refine";
  docType?: string;
  title: string;
  content: string;
};

type TAlterActivityDraftResult = {
  kind: "activity";
  writeMode?: "create" | "refine";
  formType?: string;
  title: string;
  description?: string;
  fields: Array<{
    label?: string;
    type?: string;
    required?: boolean;
    permission?: string;
    options?: string[];
    content?: string;
    gradingMethod?: string;
    rubricIds?: string[];
    rubricKeys?: string[];
  }>;
  settings?: Record<string, unknown>;
  rubrics?: Array<{
    id?: string;
    key?: string;
    title?: string;
    levels?: Array<{ label?: string; points?: number }>;
  }>;
};

type TAlterAssessmentGradeDraftResult = {
  kind: "assessment-grade";
  fillEmptyOnly?: boolean;
  byField?: Record<
    string,
    {
      score?: number;
      levelId?: string;
      comment?: string;
      byRubric?: Record<string, { levelId?: string; comment?: string }>;
    }
  >;
  final?: { comment?: string };
};

type TAlterSyllabusDraftResult = {
  kind: "syllabus";
  summary?: string;
  items: Array<{ field: string; value: string }>;
};

type TAlterDraftResult =
  | TAlterEvalDraftResult
  | TAlterArchiveDraftResult
  | TAlterDocumentDraftResult
  | TAlterActivityDraftResult
  | TAlterAssessmentGradeDraftResult
  | TAlterSyllabusDraftResult;

type TAlterAttachment = {
  kind: "text" | "image";
  name: string;
  text?: string;
  key?: string;
  mimeType?: string;
  previewUrl?: string;
  uploading?: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  skill?: string;
  draft?: TAlterDraftResult | null;
  createdAt?: string;
  /** 전송 직후 말풍선에 바로 보이는 첨부(미리보기) */
  attachments?: TAlterAttachment[];
};

const isSyllabusDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterSyllabusDraftResult => {
  if (!draft) return false;
  if (draft.kind === "syllabus") return true;
  const anyDraft = draft as unknown as {
    items?: unknown;
    rows?: unknown;
  };
  return Array.isArray(anyDraft.items) && !Array.isArray(anyDraft.rows);
};

const isArchiveDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterArchiveDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "archive";
};

const isDocumentDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterDocumentDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "document";
};

const isActivityDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterActivityDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "activity";
};

const isAssessmentGradeDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterAssessmentGradeDraftResult => {
  if (!draft) return false;
  return (draft as { kind?: string }).kind === "assessment-grade";
};

const isEvalDraft = (
  draft?: TAlterDraftResult | null
): draft is TAlterEvalDraftResult => {
  if (
    !draft ||
    isArchiveDraft(draft) ||
    isDocumentDraft(draft) ||
    isActivityDraft(draft) ||
    isAssessmentGradeDraft(draft)
  )
    return false;
  const anyDraft = draft as unknown as { rows?: unknown; kind?: string };
  return Array.isArray(anyDraft.rows) && anyDraft.kind !== "archive";
};

const SKILL_LABEL: Record<TAlterSkillId, string> = {
  chat: "챗봇",
  "syllabus-draft": "수업",
  "evaluation-draft": "평가",
  "archive-draft": "기록",
  "document-draft": "문서",
  "activity-draft": "활동",
  "assessment-grade": "채점",
};

const isDraftPrepSkill = (skill: TAlterSkillId) =>
  skill === "syllabus-draft" ||
  skill === "evaluation-draft" ||
  skill === "archive-draft" ||
  skill === "document-draft" ||
  skill === "activity-draft" ||
  skill === "assessment-grade";

const DOCUMENT_DOC_TYPES: Array<{ id: string; label: string }> = [
  { id: "manual", label: "매뉴얼·안내" },
  { id: "notice", label: "공지" },
  { id: "minutes", label: "회의록" },
  { id: "checklist", label: "체크리스트" },
  { id: "table", label: "표 중심 안내" },
  { id: "lesson", label: "학습 자료" },
  { id: "general", label: "일반 문서" },
];

const ACTIVITY_FORM_TYPES: Array<{ id: string; label: string }> = [
  { id: "survey", label: "설문·조사" },
  { id: "quiz", label: "퀴즈" },
  { id: "application", label: "신청·접수" },
  { id: "checklist", label: "체크리스트" },
  { id: "interactive", label: "인터랙티브(학습 도구)" },
  { id: "assessment", label: "평가 활동" },
  { id: "general", label: "일반 활동" },
];

const formatBubbleTime = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const skillLabel = (skill?: string) => {
  if (!skill) return "";
  if (skill === "syllabus-review") return SKILL_LABEL["syllabus-draft"];
  if (skill in SKILL_LABEL) return SKILL_LABEL[skill as TAlterSkillId];
  return skill;
};

const normalizeSkillId = (skill?: string): TAlterSkillId => {
  if (skill === "syllabus-review") return "syllabus-draft";
  if (skill && skill in SKILL_LABEL) return skill as TAlterSkillId;
  return "chat";
};

const conversationListTitle = (c: {
  contextLabel?: string;
  lastSkill?: string;
  title?: string;
  titleCustom?: boolean;
}) =>
  (c.titleCustom && c.title?.trim()) ||
  c.contextLabel?.trim() ||
  skillLabel(c.lastSkill) ||
  c.title ||
  "대화";

const EVAL_DRAFT_MAX = 30;
/** Prep에서 기본으로 선택하는 학생 수 (나눠 진행 권장) */
const EVAL_DRAFT_DEFAULT_BATCH = 8;

/** 설명 아이콘 — 클릭 시에만 안내 문구 표시 */
const PrepHint = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <span className={style.prepHintWrap} ref={rootRef}>
      <button
        type="button"
        className={style.prepHintBtn}
        aria-label="설명 보기"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Svg type="info-circle" width="13px" height="13px" />
      </button>
      {open && (
        <span className={style.prepHintPopover} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
};

/** 작성 지침 선택 행 — 체크는 선택, 제목 클릭 시 본문 펼침 */
const GuidelinePickRow = ({
  id,
  title,
  content,
  checked,
  expanded,
  onToggleChecked,
  onToggleExpanded,
}: {
  id: string;
  title: string;
  content?: string;
  checked: boolean;
  expanded: boolean;
  onToggleChecked: () => void;
  onToggleExpanded: () => void;
}) => {
  const bodyId = `${id}-guideline-body`;
  return (
    <div className={style.guidelineRow}>
      <div className={style.guidelineRowMain}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleChecked}
          aria-label={`${title} 선택`}
        />
        <button
          type="button"
          className={style.guidelineToggle}
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={bodyId}
        >
          <span className={style.guidelineTitle}>{title}</span>
        </button>
      </div>
      {expanded && content ? (
        <div id={bodyId} className={style.guidelineBody}>
          {content}
        </div>
      ) : null}
    </div>
  );
};

type Props = {
  onClose: () => void;
};

const wantsSyllabusDraftText = (text: string) =>
  /계획서.*(초안|작성)/.test(text) ||
  /(초안|작성).*계획서/.test(text) ||
  /\/(계획서|syllabus[-_]?draft)/i.test(text) ||
  /^(점검|리뷰|피드백|다시\s*점검)/.test(text) ||
  /계획서.*(점검|리뷰)/.test(text) ||
  /\/(점검|review)/i.test(text);

const wantsEvalDraftText = (text: string) =>
  /평가.*(초안|작성)/.test(text) ||
  /(초안|작성).*평가/.test(text) ||
  /\/(평가|evaluation[-_]?draft)/i.test(text);

const wantsArchiveDraftText = (text: string) =>
  /기록.*(초안|작성)/.test(text) ||
  /(초안|작성).*기록/.test(text) ||
  /행동특성|종합의견/.test(text) ||
  /\/(기록|archive[-_]?draft)/i.test(text);

const wantsDocumentDraftText = (text: string) =>
  /문서.*(초안|작성|다듬)/.test(text) ||
  /(초안|작성|다듬).*문서/.test(text) ||
  /매뉴얼|회의록|공지문/.test(text) ||
  /\/(문서|document[-_]?draft)/i.test(text);

const wantsActivityDraftText = (text: string) =>
  /활동.*(초안|작성|다듬|양식)/.test(text) ||
  /(초안|작성|다듬).*활동/.test(text) ||
  /양식.*(초안|작성)/.test(text) ||
  /\/(활동|양식|activity[-_]?draft)/i.test(text);

const AlterPanel = ({ onClose }: Props) => {
  const { currentSeason, currentRegistration, currentSchool } = useAuth();
  const {
    pageContext,
    isExpanded,
    isOpen,
    toggleExpanded,
    setIsWorking: setAlterWorking,
    setHasBackgroundResult,
  } = useAlter();

  const suggested = pageContext?.suggestedSkills?.length
    ? pageContext.suggestedSkills
    : (["chat"] as TAlterSkillId[]);

  const [selectedSkill, setSelectedSkill] = useState<TAlterSkillId>(
    suggested[0] || "chat"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [skillGuidelines, setSkillGuidelines] = useState("");
  const [skillSettingsLoading, setSkillSettingsLoading] = useState(false);
  const [sourceAttachments, setSourceAttachments] = useState<
    TAlterAttachment[]
  >([]);
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);
  /** 말풍선에 남은 object URL — 대화 초기화/언마운트 시 해제 */
  const messagePreviewUrlsRef = useRef<string[]>([]);
  const [appliedDraftIds, setAppliedDraftIds] = useState<Set<string>>(
    new Set()
  );
  const [showPrep, setShowPrep] = useState(() => {
    const first = suggested[0] || "chat";
    return isDraftPrepSkill(first);
  });

  const [evalTargetLabels, setEvalTargetLabels] = useState<string[]>([]);
  const [evalContextLabels, setEvalContextLabels] = useState<string[]>([]);
  // 기본: 자기평가·기존 멘토평가를 종합해 멘토평가를 덮어쓰는 흐름
  const [evalFillEmptyOnly, setEvalFillEmptyOnly] = useState(false);
  const [gradeFillEmptyOnly, setGradeFillEmptyOnly] = useState(false);
  const [evalScope, setEvalScope] = useState<"empty" | "all">("all");
  const [evalSelectedStudentIds, setEvalSelectedStudentIds] = useState<
    string[]
  >([]);

  const [archiveTargetLabels, setArchiveTargetLabels] = useState<string[]>([]);
  const [archiveContextLabels, setArchiveContextLabels] = useState<string[]>(
    []
  );
  // 기본은 선택 학생 전체에 작성(덮어쓰기 가능). 빈 칸만은 옵션.
  const [archiveFillEmptyOnly, setArchiveFillEmptyOnly] = useState(false);
  const [archiveScope, setArchiveScope] = useState<"empty" | "all">("all");
  const [archiveWriteMode, setArchiveWriteMode] = useState<
    "perStudent" | "sameText"
  >("perStudent");
  const [archiveSelectedStudentIds, setArchiveSelectedStudentIds] = useState<
    string[]
  >([]);
  const [archiveGuidelineItems, setArchiveGuidelineItems] = useState<
    Array<{ _id: string; title: string; content: string }>
  >([]);
  const [archiveSelectedGuidelineIds, setArchiveSelectedGuidelineIds] =
    useState<string[]>([]);

  const [docWriteMode, setDocWriteMode] = useState<"create" | "refine">(
    "create"
  );
  const [docType, setDocType] = useState("general");
  const [docGuidelineItems, setDocGuidelineItems] = useState<
    Array<{ _id: string; title: string; content: string }>
  >([]);
  const [docSelectedGuidelineIds, setDocSelectedGuidelineIds] = useState<
    string[]
  >([]);

  const [activityWriteMode, setActivityWriteMode] = useState<
    "create" | "refine"
  >("create");
  const [activityFormType, setActivityFormType] = useState("general");
  const [activityGuidelineItems, setActivityGuidelineItems] = useState<
    Array<{ _id: string; title: string; content: string }>
  >([]);
  const [activitySelectedGuidelineIds, setActivitySelectedGuidelineIds] =
    useState<string[]>([]);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("새 대화");
  const [conversations, setConversations] = useState<TAlterConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameCancelledRef = useRef(false);
  const [prepCollapsed, setPrepCollapsed] = useState(false);
  const [expandedGuidelineId, setExpandedGuidelineId] = useState<string | null>(
    null
  );
  const abortRef = useRef<AbortController | null>(null);
  const cancelledByUserRef = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const skipSmoothScrollRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    return () => {
      sourceAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      messagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      messagePreviewUrlsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cleanup only
  }, []);

  useEffect(() => {
    if (!attachMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [attachMenuOpen]);

  const guidelines = skillGuidelines.trim();

  const formEvaluation = pageContext?.formEvaluation || [];
  const teacherEditableFields = useMemo(
    () => formEvaluation.filter((f) => f?.label && f?.auth?.edit?.teacher),
    [formEvaluation]
  );
  const defaultTargetLabels = useMemo(
    () =>
      teacherEditableFields
        .filter((f) => f.type === "input")
        .map((f) => f.label),
    [teacherEditableFields]
  );
  const allEvalLabels = useMemo(
    () => formEvaluation.map((f) => f.label).filter(Boolean),
    [formEvaluation]
  );
  const formArchiveFields = pageContext?.formArchiveFields || [];
  const archiveInputFields = useMemo(
    () => formArchiveFields.filter((f) => f?.label && f.type === "input"),
    [formArchiveFields]
  );
  const archiveReferenceFields = useMemo(
    () =>
      formArchiveFields.filter(
        (f) =>
          f?.label &&
          (f.type === "input" ||
            f.type === "input-number" ||
            f.type === "select")
      ),
    [formArchiveFields]
  );
  const defaultArchiveTargetLabels = useMemo(
    () => archiveInputFields.map((f) => f.label),
    [archiveInputFields]
  );
  const defaultArchiveContextLabels = useMemo(
    () => archiveReferenceFields.map((f) => f.label),
    [archiveReferenceFields]
  );

  // 화면이 바뀌어도 진행 중/저장된 대화는 유지하고 Prep 기본값만 갱신
  useEffect(() => {
    const next = suggested[0] || "chat";
    setSelectedSkill(next);
    if (!isWorking && messages.length === 0) {
      setShowPrep(isDraftPrepSkill(next));
    }
    setEvalTargetLabels(defaultTargetLabels);
    setEvalContextLabels(allEvalLabels);
    setEvalFillEmptyOnly(false);
    setEvalScope("all");
    setEvalSelectedStudentIds([]);
    setArchiveTargetLabels(defaultArchiveTargetLabels);
    setArchiveContextLabels(defaultArchiveContextLabels);
    setArchiveFillEmptyOnly(false);
    setArchiveScope("all");
    setArchiveWriteMode("perStudent");
    setArchiveSelectedStudentIds([]);
    setArchiveSelectedGuidelineIds([]);
    const hasContent = !!(pageContext?.getDocument?.()?.content || "").trim();
    setDocWriteMode(hasContent ? "refine" : "create");
    setDocType("general");
    setDocSelectedGuidelineIds([]);
    setGradeFillEmptyOnly(false);
  }, [pageContext?.pageType, pageContext?.label]);

  useEffect(() => {
    setAlterWorking(isWorking);
  }, [isWorking, setAlterWorking]);

  const schoolIdForAlter =
    currentSchool?._id ||
    currentSchool?.school ||
    (currentSeason as { school?: string } | undefined)?.school ||
    "";

  // 새로고침·학교 전환 후에도 최근 대화를 복원 (학교 단위 목록)
  const didRestoreRef = useRef<string | null>(null);
  useEffect(() => {
    if (!schoolIdForAlter || isWorking) return;
    if (didRestoreRef.current === schoolIdForAlter) return;
    didRestoreRef.current = schoolIdForAlter;
    void (async () => {
      try {
        const res = await fetch(
          `${alterApiBase()}/alter/conversations?school=${encodeURIComponent(
            schoolIdForAlter
          )}&limit=1`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const latest = (data.conversations || [])[0] as
          | TAlterConversation
          | undefined;
        if (!latest?._id) return;
        setConversations(data.conversations || []);
        await openConversation(latest._id, latest);
      } catch {
        // ignore restore errors
      }
    })();
  }, [schoolIdForAlter]);

  useEffect(() => {
    if (pageContext?.pageType !== "evaluation") return;
    if (evalTargetLabels.length === 0 && defaultTargetLabels.length > 0) {
      setEvalTargetLabels(defaultTargetLabels);
      setEvalContextLabels(allEvalLabels);
    }
  }, [
    pageContext?.pageType,
    defaultTargetLabels,
    allEvalLabels,
    evalTargetLabels.length,
  ]);

  useEffect(() => {
    if (pageContext?.pageType !== "archive") return;
    if (
      archiveTargetLabels.length === 0 &&
      defaultArchiveTargetLabels.length > 0
    ) {
      setArchiveTargetLabels(defaultArchiveTargetLabels);
    }
    if (
      archiveContextLabels.length === 0 &&
      defaultArchiveContextLabels.length > 0
    ) {
      setArchiveContextLabels(defaultArchiveContextLabels);
    }
  }, [
    pageContext?.pageType,
    defaultArchiveTargetLabels,
    defaultArchiveContextLabels,
    archiveTargetLabels.length,
    archiveContextLabels.length,
  ]);

  useEffect(() => {
    if (!isOpen || !currentSeason?._id) return;
    if (!isDraftPrepSkill(selectedSkill)) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setSkillSettingsLoading(true);
        const res = await fetch(
          `${alterApiBase()}/alter/skill-settings?season=${encodeURIComponent(
            currentSeason._id
          )}&skill=${encodeURIComponent(selectedSkill)}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          throw new Error("스킬 설정을 불러오지 못했습니다.");
        }
        const data = await res.json();
        if (cancelled) return;
        setSkillGuidelines((data.guidelines || "").trim());
        if (
          selectedSkill === "archive-draft" ||
          selectedSkill === "document-draft" ||
          selectedSkill === "activity-draft"
        ) {
          const items = Array.isArray(data.instructionItems)
            ? data.instructionItems.map(
                (it: { _id?: string; title?: string; content?: string }) => ({
                  _id: String(it._id || ""),
                  title: it.title || "지침",
                  content: it.content || "",
                })
              )
            : [];
          const filtered = items.filter((it: { _id: string }) => it._id);
          const defaults = Array.isArray(data.defaultGuidelineItemIds)
            ? data.defaultGuidelineItemIds.map(String)
            : filtered.map((it: { _id: string }) => it._id);
          const pickIds = (
            prev: string[],
            allowedItems: Array<{ _id: string }>
          ) => {
            if (prev.length > 0) {
              const allowed = new Set(allowedItems.map((it) => it._id));
              const kept = prev.filter((id) => allowed.has(id));
              if (kept.length > 0) return kept;
            }
            return defaults;
          };
          if (selectedSkill === "archive-draft") {
            setArchiveGuidelineItems(filtered);
            setArchiveSelectedGuidelineIds((prev) => pickIds(prev, filtered));
          } else if (selectedSkill === "document-draft") {
            setDocGuidelineItems(filtered);
            setDocSelectedGuidelineIds((prev) => pickIds(prev, filtered));
          } else {
            setActivityGuidelineItems(filtered);
            setActivitySelectedGuidelineIds((prev) => pickIds(prev, filtered));
          }
        }
      } catch {
        if (cancelled) return;
        setSkillGuidelines("");
        if (selectedSkill === "archive-draft") {
          setArchiveGuidelineItems([]);
        }
        if (selectedSkill === "document-draft") {
          setDocGuidelineItems([]);
        }
        if (selectedSkill === "activity-draft") {
          setActivityGuidelineItems([]);
        }
      } finally {
        if (!cancelled) setSkillSettingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentSeason?._id, selectedSkill]);

  useEffect(() => {
    const behavior = skipSmoothScrollRef.current ? "auto" : "smooth";
    skipSmoothScrollRef.current = false;
    endRef.current?.scrollIntoView({ behavior });
  }, [messages.length, steps.length, isWorking]);

  const evalCandidateStudents = useMemo(() => {
    if (pageContext?.pageType !== "evaluation") return [];
    const rows = pageContext.getEvaluationRows?.() || [];
    const targets =
      evalTargetLabels.length > 0 ? evalTargetLabels : defaultTargetLabels;
    let filtered = rows.filter((r) => r.studentId);
    if (evalScope === "empty") {
      filtered = filtered.filter((r) =>
        targets.some((label) => isEmptyEval(r.evaluation?.[label]))
      );
    }
    return filtered.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName || "",
      studentGrade: r.studentGrade || "",
    }));
  }, [
    pageContext,
    evalTargetLabels,
    defaultTargetLabels,
    evalScope,
  ]);

  const archiveCandidateStudents = useMemo(() => {
    if (pageContext?.pageType !== "archive") return [];
    const rows = pageContext.getArchiveRows?.() || [];
    const targets =
      archiveTargetLabels.length > 0
        ? archiveTargetLabels
        : defaultArchiveTargetLabels;
    let filtered = rows.filter((r) => r.studentId);
    if (archiveScope === "empty") {
      filtered = filtered.filter((r) =>
        targets.some((label) => isEmptyEval(r.values?.[label]))
      );
    }
    return filtered.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName || "",
      studentGrade: r.studentGrade || "",
    }));
  }, [
    pageContext,
    archiveTargetLabels,
    defaultArchiveTargetLabels,
    archiveScope,
  ]);

  const evalCandidateKey = evalCandidateStudents
    .map((s) => s.studentId)
    .join("\0");
  const archiveCandidateKey = archiveCandidateStudents
    .map((s) => s.studentId)
    .join("\0");

  // 범위·작성 항목이 바뀌면 후보가 달라지므로 기본 묶음으로 다시 고른다
  useEffect(() => {
    if (pageContext?.pageType !== "evaluation") {
      setEvalSelectedStudentIds([]);
      return;
    }
    const ids = evalCandidateKey ? evalCandidateKey.split("\0") : [];
    setEvalSelectedStudentIds((prev) => {
      const valid = prev.filter((id) => ids.includes(id));
      if (valid.length > 0) {
        return valid.slice(0, EVAL_DRAFT_MAX);
      }
      return ids.slice(0, Math.min(EVAL_DRAFT_DEFAULT_BATCH, EVAL_DRAFT_MAX));
    });
  }, [pageContext?.pageType, evalCandidateKey]);

  useEffect(() => {
    if (pageContext?.pageType !== "archive") {
      setArchiveSelectedStudentIds([]);
      return;
    }
    const ids = archiveCandidateKey ? archiveCandidateKey.split("\0") : [];
    setArchiveSelectedStudentIds((prev) => {
      const valid = prev.filter((id) => ids.includes(id));
      if (valid.length > 0) {
        return valid.slice(0, EVAL_DRAFT_MAX);
      }
      return ids.slice(0, Math.min(EVAL_DRAFT_DEFAULT_BATCH, EVAL_DRAFT_MAX));
    });
  }, [pageContext?.pageType, archiveCandidateKey]);

  const evalSelectedIds = useMemo(() => {
    const allowed = new Set(evalCandidateStudents.map((s) => s.studentId));
    return evalSelectedStudentIds
      .filter((id) => allowed.has(id))
      .slice(0, EVAL_DRAFT_MAX);
  }, [evalSelectedStudentIds, evalCandidateStudents]);

  const archiveSelectedIds = useMemo(() => {
    const allowed = new Set(archiveCandidateStudents.map((s) => s.studentId));
    return archiveSelectedStudentIds
      .filter((id) => allowed.has(id))
      .slice(0, EVAL_DRAFT_MAX);
  }, [archiveSelectedStudentIds, archiveCandidateStudents]);

  const buildContext = (skill: TAlterSkillId) => {
    if (skill === "evaluation-draft") {
      const targets =
        evalTargetLabels.length > 0 ? evalTargetLabels : defaultTargetLabels;
      return {
        pageType: pageContext?.pageType || "evaluation",
        label: pageContext?.label || "",
        syllabusId: pageContext?.syllabusId || "",
        classTitle: pageContext?.classTitle || "",
        formEvaluation: pageContext?.formEvaluation || [],
        targetLabels: targets,
        // 작성 대상 필드도 기존 내용이 있으면 참고로 보낼 수 있음
        contextLabels: evalContextLabels,
        fillEmptyOnly: evalFillEmptyOnly,
        studentIds: evalSelectedIds,
        csv: pageContext?.getEvaluationCsv?.() || "",
      };
    }
    if (skill === "archive-draft") {
      const targets =
        archiveTargetLabels.length > 0
          ? archiveTargetLabels
          : defaultArchiveTargetLabels;
      const selected = new Set(archiveSelectedIds);
      const rows = (pageContext?.getArchiveRows?.() || []).filter((r) =>
        selected.has(r.studentId)
      );
      return {
        pageType: "archive",
        archiveLabel: pageContext?.archiveLabel || pageContext?.label || "",
        label: pageContext?.label || "",
        formArchive: pageContext?.formArchiveFields || [],
        targetLabels: targets,
        contextLabels:
          archiveContextLabels.length > 0
            ? archiveContextLabels
            : defaultArchiveContextLabels,
        fillEmptyOnly: archiveFillEmptyOnly,
        writeMode: archiveWriteMode,
        studentIds: archiveSelectedIds,
        guidelineItemIds: archiveSelectedGuidelineIds,
        rows,
      };
    }
    const attachmentText = sourceAttachments
      .filter((a) => a.kind === "text" && a.text)
      .map((a) => `### ${a.name}\n${a.text}`)
      .join("\n\n");
    const attachments = sourceAttachments
      .filter((a) => !a.uploading && (a.kind === "text" ? !!a.text : !!a.key))
      .map(({ kind, name, text, key, mimeType }) => ({
        kind,
        name,
        text,
        key,
        mimeType,
      }));
    if (skill === "document-draft") {
      const current = pageContext?.getDocument?.() || {
        title: "",
        content: "",
      };
      return {
        pageType: "document",
        label: pageContext?.label || "",
        boardId: pageContext?.boardId || "",
        boardName: pageContext?.boardName || "",
        writeMode: docWriteMode,
        docType,
        guidelineItemIds: docSelectedGuidelineIds,
        currentTitle: current.title || "",
        currentContent: current.content || "",
        sourceText: attachmentText,
        attachments,
      };
    }
    if (skill === "activity-draft") {
      const current = pageContext?.getActivity?.() || {
        title: "",
        description: "",
        fields: [],
        settings: {},
        rubrics: [],
      };
      return {
        pageType: "activity",
        label: pageContext?.label || "",
        boardId: pageContext?.boardId || "",
        boardName: pageContext?.boardName || "",
        writeMode: activityWriteMode,
        formType: activityFormType,
        guidelineItemIds: activitySelectedGuidelineIds,
        currentTitle: current.title || "",
        currentDescription: current.description || "",
        currentFields: current.fields || [],
        currentSettings: current.settings || {},
        currentRubrics: current.rubrics || [],
        sourceText: attachmentText,
        attachments,
      };
    }
    if (skill === "assessment-grade") {
      const gradeCtx = pageContext?.getAssessmentGradeContext?.();
      return {
        pageType: "assessment-grade",
        label: pageContext?.label || "",
        boardName: pageContext?.boardName || gradeCtx?.boardName || "",
        fillEmptyOnly: gradeFillEmptyOnly,
        formId: gradeCtx?.formId || "",
        rowId: gradeCtx?.rowId || "",
        formTitle: gradeCtx?.formTitle || "",
        respondentName: gradeCtx?.respondentName || "",
        respondentId: gradeCtx?.respondentId || "",
        finalized: !!gradeCtx?.finalized,
        fields: gradeCtx?.fields || [],
        responses: gradeCtx?.responses || {},
        currentDraft: gradeCtx?.currentDraft || { byField: {}, final: {} },
      };
    }
    return {
      pageType: pageContext?.pageType || "general",
      label: pageContext?.label || "",
      subject: pageContext?.subject || [],
      classTitle: pageContext?.classTitle || "",
      currentInfo: pageContext?.getCurrentInfo?.() || {},
      formSyllabus: pageContext?.formSyllabus || currentSeason?.formSyllabus,
      sourceText: attachmentText,
      attachments,
    };
  };

  const loadConversations = async () => {
    if (!schoolIdForAlter) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `${alterApiBase()}/alter/conversations?school=${encodeURIComponent(
          schoolIdForAlter
        )}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("대화 목록을 불러오지 못했습니다.");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err: any) {
      setError(err.message || "대화 목록을 불러오지 못했습니다.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const revokeMessagePreviews = () => {
    messagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    messagePreviewUrlsRef.current = [];
  };

  const startNewConversation = (preferSkill?: TAlterSkillId) => {
    if (isWorking) {
      setError("작업이 끝난 뒤 새 대화를 시작할 수 있습니다.");
      return;
    }
    setConversationId(null);
    setConversationTitle("새 대화");
    revokeMessagePreviews();
    setMessages([]);
    setError("");
    setSteps([]);
    setAppliedDraftIds(new Set());
    setSourceAttachments((prev) => {
      prev.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
      return [];
    });
    setShowHistory(false);
    setExpandedGuidelineId(null);
    // onClick에 그대로 넘기면 이벤트가 들어오므로 스킬 id만 허용
    const next =
      preferSkill && preferSkill in SKILL_LABEL
        ? preferSkill
        : suggested[0] || "chat";
    setSelectedSkill(next);
    const prep = isDraftPrepSkill(next);
    setShowPrep(prep);
    if (prep) setPrepCollapsed(false);
  };

  const selectSkill = (skill: TAlterSkillId) => {
    if (isWorking) return;
    // 챗방 = 스킬 1개: 기존 대화에서 다른 스킬이면 새 대화로
    if (conversationId && selectedSkill !== skill) {
      startNewConversation(skill);
      return;
    }
    setSelectedSkill(skill);
    setExpandedGuidelineId(null);
    const prep = isDraftPrepSkill(skill);
    setShowPrep(prep);
    if (prep) setPrepCollapsed(false);
  };

  const openHistoryList = () => {
    setShowHistory(true);
    void loadConversations();
  };

  const openConversation = async (
    id: string,
    preset?: TAlterConversation
  ) => {
    if (isWorking) {
      setError("작업이 끝난 뒤 다른 대화를 열 수 있습니다.");
      return;
    }
    setHistoryLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${alterApiBase()}/alter/conversations/${id}/messages`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("대화를 불러오지 못했습니다.");
      const data = await res.json();
      const rows = (data.messages || []) as Array<{
        _id: string;
        role: "user" | "assistant";
        content: string;
        skill?: string;
        review?: any;
        draft?: any;
        createdAt?: string;
        attachments?: Array<{
          kind: "text" | "image";
          name?: string;
          key?: string;
          mimeType?: string;
          previewUrl?: string;
        }>;
      }>;
      setConversationId(id);
      const meta =
        preset || conversations.find((c) => c._id === id);
      setConversationTitle(
        conversationListTitle(meta || { title: "대화" })
      );
      revokeMessagePreviews();
      skipSmoothScrollRef.current = true;
      setMessages(
        rows.map((m) => {
          const attachments = (m.attachments || []).map((a) => ({
            kind: a.kind,
            name: a.name || "첨부",
            key: a.key,
            mimeType: a.mimeType,
            previewUrl: a.previewUrl,
          }));
          // 첨부가 있으면 `[첨부: 이름]`만 있는 본문은 말풍선에서 숨김
          const raw = m.content || "";
          const attachOnly =
            attachments.length > 0 &&
            raw
              .replace(/\[첨부:\s*[^\]]+\]/g, "")
              .replace(/\s+/g, "")
              .length === 0;
          return {
            id: m._id,
            role: m.role,
            content: attachOnly ? "" : raw,
            skill: m.skill,
            review: m.review || null,
            draft: m.draft || null,
            createdAt: m.createdAt,
            attachments: attachments.length > 0 ? attachments : undefined,
          };
        })
      );
      setShowHistory(false);
      const restored = normalizeSkillId(meta?.lastSkill);
      setSelectedSkill(restored);
      const prep = isDraftPrepSkill(restored);
      setShowPrep(prep);
      if (prep) setPrepCollapsed(false);
    } catch (err: any) {
      setError(err.message || "대화를 불러오지 못했습니다.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    if (isWorking && conversationId === id) return;
    try {
      const res = await fetch(`${alterApiBase()}/alter/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("대화를 삭제하지 못했습니다.");
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (renamingId === id) {
        setRenamingId(null);
        setRenameDraft("");
      }
      if (conversationId === id) startNewConversation();
    } catch (err: any) {
      setError(err.message || "대화를 삭제하지 못했습니다.");
    }
  };

  const beginRenameConversation = (c: TAlterConversation) => {
    renameCancelledRef.current = false;
    setRenamingId(c._id);
    setRenameDraft(conversationListTitle(c));
    setError("");
  };

  const cancelRenameConversation = () => {
    renameCancelledRef.current = true;
    setRenamingId(null);
    setRenameDraft("");
  };

  const submitRenameConversation = async () => {
    if (renameCancelledRef.current) {
      renameCancelledRef.current = false;
      return;
    }
    const id = renamingId;
    const draft = renameDraft;
    if (!id) return;
    // Enter 후 blur로 이중 호출되지 않게 즉시 종료
    setRenamingId(null);
    setRenameDraft("");
    const next = draft.replace(/\s+/g, " ").trim();
    if (!next) return;
    const prev = conversations.find((c) => c._id === id);
    if (prev && conversationListTitle(prev) === next) return;
    try {
      const res = await fetch(`${alterApiBase()}/alter/conversations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "이름을 바꾸지 못했습니다.");
      }
      const data = await res.json();
      const updated = data.conversation as TAlterConversation | undefined;
      setConversations((list) =>
        list.map((c) =>
          c._id === id
            ? {
                ...c,
                title: updated?.title || next,
                titleCustom: true,
              }
            : c
        )
      );
      if (conversationId === id) {
        setConversationTitle(updated?.title || next);
      }
    } catch (err: any) {
      setError(err.message || "이름을 바꾸지 못했습니다.");
    }
  };

  const parseSse = async (
    response: Response,
    onStep: (m: string) => void,
    onActivity?: () => void
  ): Promise<{
    draft?: TAlterDraftResult | null;
    message?: string;
    skill?: string;
    conversationId?: string | null;
  }> => {
    if (!response.ok || !response.body) {
      throw new Error("AI 요청에 실패했습니다.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: {
      draft?: TAlterDraftResult | null;
      message?: string;
      skill?: string;
      conversationId?: string | null;
    } = {};
    let errMsg = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onActivity?.();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) eventType = line.slice(7);
        else if (line.startsWith("data: ") && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === "step") onStep(data.message || "");
            else if (eventType === "error") {
              errMsg =
                MESSAGE.get(data.message) ||
                data.message ||
                "AI 처리 중 오류가 발생했습니다.";
              if (data.conversationId) {
                result.conversationId = data.conversationId;
              }
            } else if (eventType === "done") {
              result = {
                draft: data.draft || null,
                message: data.message || data.text || "",
                skill: data.skill,
                conversationId: data.conversationId || null,
              };
            }
          } catch {
            // ignore
          }
          eventType = "";
        }
      }
    }
    if (errMsg) throw new Error(errMsg);
    return result;
  };

  const combinedSourceText = () => {
    const parts = [
      draft.trim(),
      ...sourceAttachments
        .filter((a) => a.kind === "text" && a.text)
        .map((a) => `[첨부: ${a.name}]\n${a.text}`),
    ].filter(Boolean);
    return parts.join("\n\n").trim();
  };

  const removeAttachment = (index: number) => {
    setSourceAttachments((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const attachmentLabel = (a: TAlterAttachment) => {
    if (a.kind === "image") return a.name;
    const n = (a.text || "").length;
    return n > 0 ? `${a.name} (${n.toLocaleString()}자)` : a.name;
  };

  const runSkill = async (skill: TAlterSkillId, userText: string) => {
    if (!currentSeason?._id) {
      setError("학기 정보가 없어 Alter를 사용할 수 없습니다.");
      return;
    }

    if (skill === "syllabus-draft") {
      if (pageContext?.pageType !== "syllabus-edit") {
        setError("강의계획서 작성/수정 화면에서 초안을 작성할 수 있습니다.");
        return;
      }
      if (!userText.trim() && sourceAttachments.length === 0) {
        setError("초안에 쓸 정보를 입력하거나 파일을 첨부해 주세요.");
        return;
      }
    }

    if (skill === "document-draft") {
      if (pageContext?.pageType !== "document") {
        setError("문서 작성/수정 화면에서 초안을 작성할 수 있습니다.");
        return;
      }
      const current = pageContext?.getDocument?.() || {
        title: "",
        content: "",
      };
      if (
        docWriteMode === "create" &&
        !userText.trim() &&
        sourceAttachments.length === 0
      ) {
        setError("초안에 쓸 정보를 입력하거나 파일을 첨부해 주세요.");
        return;
      }
      if (
        docWriteMode === "refine" &&
        !(current.content || "").trim() &&
        !userText.trim() &&
        sourceAttachments.length === 0
      ) {
        setError(
          "다듬을 본문이 없습니다. 에디터에 내용을 쓰거나 요청을 입력해 주세요."
        );
        return;
      }
    }

    if (skill === "activity-draft") {
      if (pageContext?.pageType !== "activity") {
        setError("활동 양식 작성/수정 화면에서 초안을 작성할 수 있습니다.");
        return;
      }
      const current = pageContext?.getActivity?.() || {
        title: "",
        description: "",
        fields: [],
        settings: {},
        rubrics: [],
      };
      if (
        activityWriteMode === "create" &&
        !userText.trim() &&
        sourceAttachments.length === 0
      ) {
        setError("초안에 쓸 정보를 입력하거나 파일을 첨부해 주세요.");
        return;
      }
      if (
        activityWriteMode === "refine" &&
        !(current.title || "").trim() &&
        !(current.fields || []).length &&
        !userText.trim() &&
        sourceAttachments.length === 0
      ) {
        setError(
          "다듬을 양식이 없습니다. 에디터에 내용을 쓰거나 요청을 입력해 주세요."
        );
        return;
      }
    }

    if (skill === "assessment-grade") {
      if (pageContext?.pageType !== "assessment-grade") {
        setError("평가 기록 문서 보기에서 채점할 수 있습니다.");
        return;
      }
      const gradeCtx = pageContext?.getAssessmentGradeContext?.();
      if (!gradeCtx?.formId || !gradeCtx?.rowId) {
        setError("채점할 응답을 열어 주세요.");
        return;
      }
      if (gradeCtx.finalized) {
        setError("이미 확정된 평가입니다. 확정을 해제한 뒤 다시 시도해 주세요.");
        return;
      }
      if (!(gradeCtx.fields || []).length) {
        setError("채점 대상 항목이 없습니다.");
        return;
      }
    }

    if (skill === "evaluation-draft") {
      if (pageContext?.pageType !== "evaluation") {
        setError("수업 평가 화면에서 초안을 작성할 수 있습니다.");
        return;
      }
      const targets =
        evalTargetLabels.length > 0 ? evalTargetLabels : defaultTargetLabels;
      if (targets.length === 0) {
        setError("작성할 평가 항목을 선택해 주세요.");
        return;
      }
      if (evalCandidateStudents.length === 0) {
        setError(
          evalScope === "empty"
            ? "채울 빈 칸이 있는 학생이 없습니다."
            : "초안을 작성할 학생이 없습니다."
        );
        return;
      }
      if (evalSelectedIds.length === 0) {
        setError("초안을 작성할 학생을 선택해 주세요.");
        return;
      }
    }

    if (skill === "archive-draft") {
      if (pageContext?.pageType !== "archive") {
        setError("기록 화면에서 초안을 작성할 수 있습니다.");
        return;
      }
      const targets =
        archiveTargetLabels.length > 0
          ? archiveTargetLabels
          : defaultArchiveTargetLabels;
      if (targets.length === 0) {
        setError("작성할 기록 항목을 선택해 주세요.");
        return;
      }
      if (archiveCandidateStudents.length === 0) {
        setError(
          archiveScope === "empty"
            ? "채울 빈 칸이 있는 학생이 없습니다."
            : "초안을 작성할 학생이 없습니다."
        );
        return;
      }
      if (archiveSelectedIds.length === 0) {
        setError("초안을 작성할 학생을 선택해 주세요.");
        return;
      }
    }

    if (attachUploading || sourceAttachments.some((a) => a.uploading)) {
      setError("첨부 업로드가 끝난 뒤 보내 주세요.");
      return;
    }

    const pendingAttachments = sourceAttachments.filter(
      (a) => !a.uploading && (a.kind === "text" ? !!a.text : !!a.key)
    );

    setIsWorking(true);
    setError("");
    setSteps([]);
    setShowPrep(false);
    setShowHistory(false);
    setAttachMenuOpen(false);

    const displayContent = userText.trim();
    const titleFallback =
      pageContext?.label?.trim() ||
      skillLabel(skill) ||
      displayContent ||
      pendingAttachments.map((a) => a.name).join(", ") ||
      "대화";
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: displayContent,
      skill,
      createdAt: new Date().toISOString(),
      attachments: pendingAttachments.map(
        ({ kind, name, mimeType, previewUrl, key }) => ({
          kind,
          name,
          mimeType,
          previewUrl,
          key,
        })
      ),
    };
    pendingAttachments.forEach((a) => {
      if (a.previewUrl) messagePreviewUrlsRef.current.push(a.previewUrl);
    });
    // 말풍선에 바로 올린 뒤 입력창 첨부는 비움 (URL은 말풍선용이므로 revoke 하지 않음)
    setSourceAttachments([]);

    const history = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content:
          m.content ||
          (m.attachments?.length
            ? m.attachments.map((a) => `[첨부: ${a.name}]`).join(" ")
            : ""),
      }));

    setMessages((prev) => [...prev, userMsg]);
    if (!conversationId || conversationTitle === "새 대화") {
      setConversationTitle(titleFallback.replace(/\s+/g, " ").trim().slice(0, 40));
    }

    const abort = new AbortController();
    abortRef.current = abort;
    let timedOut = false;
    cancelledByUserRef.current = false;
    // 서버가 진행 이벤트를 계속 보내는 동안은 끊지 않는다 (무응답 시간 기준)
    const inactivityTimeoutMs = isDraftPrepSkill(skill) ? 90_000 : 60_000;
    let timeoutId = window.setTimeout(() => {
      timedOut = true;
      abort.abort();
    }, inactivityTimeoutMs);
    const resetInactivityTimeout = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        timedOut = true;
        abort.abort();
      }, inactivityTimeoutMs);
    };

    try {
      const response = await fetch(`${alterApiBase()}/alter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abort.signal,
        body: JSON.stringify({
          season: currentSeason._id,
          skill,
          // 본문이 없을 때만 첨부 라벨을 남겨 대화 목록/히스토리에 보이게 함
          message:
            userText.trim() ||
            (pendingAttachments.length
              ? pendingAttachments.map((a) => `[첨부: ${a.name}]`).join(" ")
              : ""),
          history: history.slice(0, -1),
          context: {
            ...buildContext(skill),
            attachments: pendingAttachments.map(
              ({ kind, name, text, key, mimeType }) => ({
                kind,
                name,
                text,
                key,
                mimeType,
              })
            ),
            sourceText: pendingAttachments
              .filter((a) => a.kind === "text" && a.text)
              .map((a) => `### ${a.name}\n${a.text}`)
              .join("\n\n"),
          },
          autoDetectSkill: false,
          conversationId,
          persist: true,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const result = await parseSse(
          response,
          (m) => {
            setSteps((prev) => [...prev, m]);
          },
          resetInactivityTimeout
        );
        if (result.conversationId) {
          setConversationId(result.conversationId);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: result.message || "응답을 생성했습니다.",
            skill: result.skill || skill,
            draft: result.draft,
            createdAt: new Date().toISOString(),
          },
        ]);
        if (!isOpenRef.current) setHasBackgroundResult(true);
      } else {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data.conversationId) setConversationId(data.conversationId);
          throw new Error(
            MESSAGE.get(data.message) ||
              data.message ||
              "AI 요청에 실패했습니다."
          );
        }
        const data = await response.json();
        if (data.conversationId) setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.message || data.text || "",
            skill: data.skill || skill,
            draft: data.draft,
            createdAt: new Date().toISOString(),
          },
        ]);
        if (!isOpenRef.current) setHasBackgroundResult(true);
      }
      if (isDraftPrepSkill(skill)) {
        setSelectedSkill("chat");
        setShowPrep(false);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (timedOut) {
          setError(
            `${Math.round(
              inactivityTimeoutMs / 1000
            )}초 동안 응답이 없어 요청을 중단했습니다. 잠시 후 다시 시도해 주세요.`
          );
        } else if (cancelledByUserRef.current) {
          setError("생성을 중단했습니다.");
        }
        return;
      }
      setError(
        MESSAGE.get(err.message) || err.message || "AI 처리에 실패했습니다."
      );
    } finally {
      window.clearTimeout(timeoutId);
      setIsWorking(false);
      abortRef.current = null;
      cancelledByUserRef.current = false;
    }
  };

  const cancelWorking = () => {
    cancelledByUserRef.current = true;
    abortRef.current?.abort();
  };

  const startSuggested = () => {
    if (
      selectedSkill === "evaluation-draft" ||
      (showPrep && pageContext?.pageType === "evaluation")
    ) {
      void runSkill(
        "evaluation-draft",
        draft.trim() || "평가 초안을 작성해 주세요."
      );
      return;
    }
    if (
      selectedSkill === "archive-draft" ||
      (showPrep && pageContext?.pageType === "archive")
    ) {
      void runSkill(
        "archive-draft",
        draft.trim() ||
          (archiveWriteMode === "sameText"
            ? "선택 학생에게 동일한 기록 문구 초안을 작성해 주세요."
            : "학생별 기록 초안을 작성해 주세요.")
      );
      return;
    }
    if (
      selectedSkill === "document-draft" ||
      (showPrep && pageContext?.pageType === "document")
    ) {
      const text = combinedSourceText();
      void runSkill(
        "document-draft",
        text ||
          (docWriteMode === "refine"
            ? "현재 문서를 목적에 맞게 다듬어 주세요."
            : "문서 초안을 작성해 주세요.")
      );
      setDraft("");
      return;
    }
    if (
      selectedSkill === "activity-draft" ||
      (showPrep && pageContext?.pageType === "activity")
    ) {
      const text = combinedSourceText();
      void runSkill(
        "activity-draft",
        text ||
          (activityWriteMode === "refine"
            ? "현재 활동 양식을 목적에 맞게 다듬어 주세요."
            : "활동 양식 초안을 작성해 주세요.")
      );
      setDraft("");
      return;
    }
    if (
      selectedSkill === "assessment-grade" ||
      (showPrep && pageContext?.pageType === "assessment-grade")
    ) {
      const text = draft.trim();
      void runSkill(
        "assessment-grade",
        text || "이 응답을 루브릭에 맞게 채점 초안을 작성해 주세요."
      );
      setDraft("");
      return;
    }
    if (selectedSkill === "syllabus-draft" || showPrep) {
      const text = combinedSourceText();
      void runSkill(
        "syllabus-draft",
        text || "강의계획서 초안을 작성해 주세요."
      );
      setDraft("");
      return;
    }
    setShowPrep(false);
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (
      (!text && sourceAttachments.length === 0) ||
      isWorking ||
      attachUploading
    )
      return;
    setDraft("");
    let skill: TAlterSkillId = "chat";
    if (
      wantsEvalDraftText(text) &&
      pageContext?.pageType === "evaluation"
    ) {
      skill = "evaluation-draft";
    } else if (
      wantsArchiveDraftText(text) &&
      pageContext?.pageType === "archive"
    ) {
      skill = "archive-draft";
    } else if (
      wantsDocumentDraftText(text) &&
      pageContext?.pageType === "document"
    ) {
      skill = "document-draft";
    } else if (
      wantsActivityDraftText(text) &&
      pageContext?.pageType === "activity"
    ) {
      skill = "activity-draft";
    } else if (
      (/채점/.test(text) || selectedSkill === "assessment-grade") &&
      pageContext?.pageType === "assessment-grade"
    ) {
      skill = "assessment-grade";
    } else if (
      (wantsSyllabusDraftText(text) || sourceAttachments.length > 0) &&
      pageContext?.pageType === "syllabus-edit"
    ) {
      skill = "syllabus-draft";
    } else if (
      selectedSkill === "syllabus-draft" &&
      pageContext?.pageType === "syllabus-edit"
    ) {
      skill = "syllabus-draft";
    } else if (
      selectedSkill === "document-draft" &&
      pageContext?.pageType === "document"
    ) {
      skill = "document-draft";
    } else if (
      selectedSkill === "activity-draft" &&
      pageContext?.pageType === "activity"
    ) {
      skill = "activity-draft";
    }
    void runSkill(skill, text);
  };

  const guessAttachKind = (file: File): "image" | "file" => {
    const lower = file.name.toLowerCase();
    if (
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp)$/i.test(lower)
    ) {
      return "image";
    }
    return "file";
  };

  const isAcceptedAlterFile = (file: File) => {
    const lower = file.name.toLowerCase();
    const mime = String(file.type || "").toLowerCase();
    if (
      ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mime) ||
      /\.(png|jpe?g|webp)$/i.test(lower)
    ) {
      return true;
    }
    return (
      /\.(txt|md|markdown|csv|pdf|docx)$/i.test(lower) ||
      [
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(mime)
    );
  };

  const collectClipboardFiles = (dt: DataTransfer | null): File[] => {
    if (!dt) return [];
    const byKey = new Map<string, File>();
    const add = (file: File | null) => {
      if (!file) return;
      const key = `${file.name}|${file.size}|${file.type}|${file.lastModified}`;
      if (!byKey.has(key)) byKey.set(key, file);
    };
    if (dt.files?.length) {
      Array.from(dt.files).forEach(add);
    }
    if (dt.items?.length) {
      for (const item of Array.from(dt.items)) {
        if (item.kind === "file") add(item.getAsFile());
      }
    }
    return Array.from(byKey.values());
  };

  const handlePasteAttach = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (isWorking || attachUploading) return;
    const files = collectClipboardFiles(e.clipboardData).filter(
      isAcceptedAlterFile
    );
    if (files.length === 0) return; // 일반 텍스트 붙여넣기 유지
    e.preventDefault();
    void handleAttachFiles(files);
  };

  const handleAttachFiles = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    if (!currentSeason?._id) {
      setError("학기 정보가 없어 첨부할 수 없습니다.");
      return;
    }
    const remaining = 3 - sourceAttachments.length;
    if (remaining <= 0) {
      setError("첨부는 최대 3개까지입니다.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const picked = Array.from(files as ArrayLike<File>).slice(0, remaining);
    setAttachMenuOpen(false);
    setAttachUploading(true);
    setError("");

    // 채팅처럼 입력창에 바로 미리보기 칩을 올린 뒤 업로드
    const placeholders: TAlterAttachment[] = picked.map((file) => {
      const isImage = guessAttachKind(file) === "image";
      return {
        kind: isImage ? "image" : "text",
        name: file.name,
        mimeType: file.type || undefined,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        uploading: true,
      };
    });
    setSourceAttachments((prev) => [...prev, ...placeholders].slice(0, 3));

    try {
      for (let i = 0; i < picked.length; i++) {
        const file = picked[i];
        const placeholder = placeholders[i];
        if (file.size > 5 * 1024 * 1024) {
          setError(`"${file.name}" 파일이 너무 큽니다. (최대 5MB)`);
          setSourceAttachments((prev) =>
            prev.filter((a) => {
              if (a === placeholder || (a.uploading && a.name === file.name && a.previewUrl === placeholder.previewUrl)) {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
                return false;
              }
              return true;
            })
          );
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(
          `${alterApiBase()}/alter/attachment?season=${encodeURIComponent(
            currentSeason._id
          )}`,
          { method: "POST", credentials: "include", body: form }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            MESSAGE.get(data.message) ||
              data.message ||
              `"${file.name}" 첨부에 실패했습니다.`
          );
          setSourceAttachments((prev) =>
            prev.filter((a) => {
              if (
                a.uploading &&
                a.name === file.name &&
                a.previewUrl === placeholder.previewUrl
              ) {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
                return false;
              }
              return true;
            })
          );
          continue;
        }
        const att = data.attachment as TAlterAttachment | undefined;
        if (!att?.kind) {
          setSourceAttachments((prev) =>
            prev.filter((a) => {
              if (
                a.uploading &&
                a.name === file.name &&
                a.previewUrl === placeholder.previewUrl
              ) {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
                return false;
              }
              return true;
            })
          );
          continue;
        }
        setSourceAttachments((prev) =>
          prev.map((a) =>
            a.uploading &&
            a.name === file.name &&
            a.previewUrl === placeholder.previewUrl
              ? {
                  kind: att.kind,
                  name: att.name || file.name,
                  text: att.text,
                  key: att.key,
                  mimeType: att.mimeType,
                  previewUrl: placeholder.previewUrl,
                  uploading: false,
                }
              : a
          )
        );
      }
    } catch {
      setError("첨부 업로드 중 오류가 발생했습니다.");
      setSourceAttachments((prev) =>
        prev.filter((a) => {
          if (a.uploading) {
            if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
            return false;
          }
          return true;
        })
      );
    } finally {
      setAttachUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const applyDraft = (msgId: string, draftResult: TAlterDraftResult) => {
    if (isSyllabusDraft(draftResult)) {
      if (!pageContext?.applyInfoDraft) return;
      const values: Record<string, string> = {};
      for (const item of draftResult.items || []) {
        if (item?.field && item?.value) values[item.field] = item.value;
      }
      const result = pageContext.applyInfoDraft(values);
      setAppliedDraftIds((prev) => new Set(prev).add(msgId));
      if (result.applied === 0) {
        setError("반영할 초안 내용이 없었습니다.");
      } else {
        setError("");
        setMessages((prev) => [
          ...prev,
          {
            id: `a-applied-${Date.now()}`,
            role: "assistant",
            content: `초안 ${result.applied}개 항목을 학습 계획서에 반영했습니다. 내용을 확인·수정한 뒤 저장해 주세요.`,
            skill: "syllabus-draft",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return;
    }

    if (isArchiveDraft(draftResult)) {
      if (!pageContext?.applyArchiveDraft) return;
      const result = pageContext.applyArchiveDraft(draftResult, {
        fillEmptyOnly: draftResult.fillEmptyOnly !== false,
      });
      setAppliedDraftIds((prev) => new Set(prev).add(msgId));
      if (result.applied === 0) {
        setError("반영할 빈 칸이 없었습니다. 이미 값이 있는 칸은 유지됩니다.");
      } else {
        setError("");
        setMessages((prev) => [
          ...prev,
          {
            id: `a-applied-${Date.now()}`,
            role: "assistant",
            content: `초안 ${result.applied}칸을 기록에 반영했습니다. 확인 후 「변경 사항 저장」을 눌러 주세요.`,
            skill: "archive-draft",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return;
    }

    if (isDocumentDraft(draftResult)) {
      if (!pageContext?.applyDocumentDraft) return;
      const result = pageContext.applyDocumentDraft({
        title: draftResult.title,
        content: draftResult.content,
      });
      setAppliedDraftIds((prev) => new Set(prev).add(msgId));
      if (!result.applied) {
        setError("반영할 문서 초안이 없었습니다.");
      } else {
        setError("");
        setMessages((prev) => [
          ...prev,
          {
            id: `a-applied-${Date.now()}`,
            role: "assistant",
            content:
              "문서 초안을 에디터에 반영했습니다. 내용을 확인·수정한 뒤 저장해 주세요.",
            skill: "document-draft",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return;
    }

    if (isActivityDraft(draftResult)) {
      if (!pageContext?.applyActivityDraft) return;
      const result = pageContext.applyActivityDraft({
        title: draftResult.title,
        description: draftResult.description,
        fields: (draftResult.fields || []) as any,
        settings: draftResult.settings,
        rubrics: draftResult.rubrics as any,
      });
      setAppliedDraftIds((prev) => new Set(prev).add(msgId));
      if (!result.applied) {
        setError("반영할 활동 초안이 없었습니다.");
      } else {
        setError("");
        setMessages((prev) => [
          ...prev,
          {
            id: `a-applied-${Date.now()}`,
            role: "assistant",
            content:
              "활동 양식 초안을 에디터에 반영했습니다. 양식·설정을 확인·수정한 뒤 저장해 주세요.",
            skill: "activity-draft",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return;
    }

    if (isAssessmentGradeDraft(draftResult)) {
      if (!pageContext?.applyGradeDraft) return;
      const result = pageContext.applyGradeDraft(
        {
          byField: draftResult.byField,
          final: draftResult.final,
        },
        {
          fillEmptyOnly:
            draftResult.fillEmptyOnly !== undefined
              ? !!draftResult.fillEmptyOnly
              : gradeFillEmptyOnly,
        }
      );
      setAppliedDraftIds((prev) => new Set(prev).add(msgId));
      if (!result.applied) {
        setError(
          "반영할 채점 초안이 없거나 이미 확정된 평가입니다."
        );
      } else {
        setError("");
        setMessages((prev) => [
          ...prev,
          {
            id: `a-applied-${Date.now()}`,
            role: "assistant",
            content:
              "채점 초안을 문서 보기에 반영했습니다. 확인 후 「채점 저장」또는 「평가 확정」을 눌러 주세요.",
            skill: "assessment-grade",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      return;
    }

    if (!isEvalDraft(draftResult) || !pageContext?.applyEvaluationCsv) return;
    if (!draftResult.csv) return;
    const result = pageContext.applyEvaluationCsv(draftResult.csv, {
      fillEmptyOnly: draftResult.fillEmptyOnly !== false,
    });
    setAppliedDraftIds((prev) => new Set(prev).add(msgId));
    if (result.applied === 0) {
      setError("반영할 빈 칸이 없었습니다. 이미 값이 있는 칸은 유지됩니다.");
    } else {
      setError("");
      setMessages((prev) => [
        ...prev,
        {
          id: `a-applied-${Date.now()}`,
          role: "assistant",
          content: `초안 ${result.applied}칸을 평가 표에 반영했습니다. 확인 후 행별 「저장」을 눌러 주세요.`,
          skill: "evaluation-draft",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const toggleLabel = (
    label: string,
    list: string[],
    setList: (next: string[]) => void
  ) => {
    if (list.includes(label)) {
      setList(list.filter((l) => l !== label));
    } else {
      setList([...list, label]);
    }
  };

  const toggleStudentId = (studentId: string) => {
    setEvalSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }
      if (prev.length >= EVAL_DRAFT_MAX) return prev;
      return [...prev, studentId];
    });
  };

  const toggleArchiveStudentId = (studentId: string) => {
    setArchiveSelectedStudentIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      }
      if (prev.length >= EVAL_DRAFT_MAX) return prev;
      return [...prev, studentId];
    });
  };

  const selectDefaultStudentBatch = () => {
    setEvalSelectedStudentIds(
      evalCandidateStudents
        .slice(0, Math.min(EVAL_DRAFT_DEFAULT_BATCH, EVAL_DRAFT_MAX))
        .map((s) => s.studentId)
    );
  };

  const selectAllCandidateStudents = () => {
    setEvalSelectedStudentIds(
      evalCandidateStudents.slice(0, EVAL_DRAFT_MAX).map((s) => s.studentId)
    );
  };

  const selectDefaultArchiveStudentBatch = () => {
    setArchiveSelectedStudentIds(
      archiveCandidateStudents
        .slice(0, Math.min(EVAL_DRAFT_DEFAULT_BATCH, EVAL_DRAFT_MAX))
        .map((s) => s.studentId)
    );
  };

  const selectAllArchiveCandidateStudents = () => {
    setArchiveSelectedStudentIds(
      archiveCandidateStudents.slice(0, EVAL_DRAFT_MAX).map((s) => s.studentId)
    );
  };

  const contextLabel =
    pageContext?.label ||
    (pageContext?.pageType === "syllabus-edit"
      ? "강의계획서 작성"
      : pageContext?.pageType === "evaluation"
        ? "평가"
        : pageContext?.pageType === "archive"
          ? "기록"
          : pageContext?.pageType === "document"
            ? "문서"
            : pageContext?.pageType === "activity"
              ? "활동"
              : pageContext?.pageType === "assessment-grade"
                ? "채점"
                : "일반");

  const inSyllabusPrep = showPrep && selectedSkill === "syllabus-draft";
  const inEvalPrep = showPrep && selectedSkill === "evaluation-draft";
  const inArchivePrep = showPrep && selectedSkill === "archive-draft";
  const inDocPrep = showPrep && selectedSkill === "document-draft";
  const inActivityPrep = showPrep && selectedSkill === "activity-draft";
  const inGradePrep = showPrep && selectedSkill === "assessment-grade";
  const inPrep =
    inSyllabusPrep ||
    inEvalPrep ||
    inArchivePrep ||
    inDocPrep ||
    inActivityPrep ||
    inGradePrep;

  const skillChips: TAlterSkillId[] = [];
  const pushSkillChip = (s: TAlterSkillId) => {
    if (!skillChips.includes(s)) skillChips.push(s);
  };
  if (conversationId) pushSkillChip(selectedSkill);
  suggested.forEach(pushSkillChip);
  pushSkillChip("chat");

  const expandToggleBtn = (
    <button
      type="button"
      className={chatUiStyle.iconBtn}
      onClick={toggleExpanded}
      aria-label={isExpanded ? "작게 보기" : "크게 보기"}
      title={isExpanded ? "작게 보기" : "크게 보기"}
    >
      {isExpanded ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
        </svg>
      )}
    </button>
  );

  const prepPrimaryLabel =
    inEvalPrep ||
    inArchivePrep ||
    inDocPrep ||
    inActivityPrep ||
    inGradePrep
      ? messages.some(
          (m) =>
            m.draft &&
            (inGradePrep
              ? isAssessmentGradeDraft(m.draft)
              : inActivityPrep
                ? isActivityDraft(m.draft)
                : inDocPrep
                  ? isDocumentDraft(m.draft)
                  : inArchivePrep
                    ? isArchiveDraft(m.draft)
                    : isEvalDraft(m.draft))
        )
        ? "다시 작성"
        : inGradePrep
          ? "채점 초안 작성"
          : "초안 작성"
      : messages.some((m) => m.draft && isSyllabusDraft(m.draft))
        ? "다시 작성"
        : "초안 작성";

  const attachDisabled =
    isWorking || attachUploading || sourceAttachments.length >= 3;

  const attachButton = (
    <div className={chatUiStyle.actionMenuWrap} ref={attachMenuRef}>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        multiple
        hidden
        onChange={(e) => void handleAttachFiles(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.csv,.pdf,.docx,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        hidden
        onChange={(e) => void handleAttachFiles(e.target.files)}
      />
      <button
        type="button"
        className={chatUiStyle.slotBtn}
        onClick={() => setAttachMenuOpen((v) => !v)}
        aria-label="첨부"
        title="사진·파일 첨부"
        aria-expanded={attachMenuOpen}
        disabled={attachDisabled}
      >
        <Svg type="plus" width="20px" height="20px" />
      </button>
      {attachMenuOpen && (
        <div className={chatUiStyle.actionMenu} role="menu">
          <button
            type="button"
            className={`${chatUiStyle.actionMenuItem} ${style.attachMenuItem}`}
            role="menuitem"
            disabled={attachDisabled}
            onClick={() => imageInputRef.current?.click()}
          >
            <Svg type="image" width="18px" height="18px" />
            사진
          </button>
          <button
            type="button"
            className={`${chatUiStyle.actionMenuItem} ${style.attachMenuItem}`}
            role="menuitem"
            disabled={attachDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Svg type="file" width="18px" height="18px" />
            파일
          </button>
        </div>
      )}
    </div>
  );

  const renderAttachmentBlock = (
    items: TAlterAttachment[],
    opts?: { removable?: boolean; onRemove?: (index: number) => void }
  ) => (
    <div className={style.msgAttachList}>
      {items.map((a, index) => (
        <div
          key={`${a.kind}-${a.name}-${index}`}
          className={`${style.msgAttachItem} ${
            a.kind === "image" ? style.msgAttachImage : style.msgAttachFile
          } ${a.uploading ? style.msgAttachUploading : ""}`}
        >
          {a.kind === "image" && a.previewUrl ? (
            <img src={a.previewUrl} alt={a.name} className={style.msgAttachImg} />
          ) : (
            <div className={style.msgAttachFileInner}>
              <Svg type="file" width="18px" height="18px" />
              <span className={style.msgAttachFileName} title={a.name}>
                {a.uploading ? `${a.name} (업로드 중…)` : attachmentLabel(a)}
              </span>
            </div>
          )}
          {opts?.removable ? (
            <button
              type="button"
              className={style.attachChipRemove}
              onClick={() => opts.onRemove?.(index)}
              aria-label={`${a.name} 제거`}
              disabled={isWorking || a.uploading}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );

  const attachmentChips =
    sourceAttachments.length > 0 ? (
      <div className={style.attachChipRow}>
        {renderAttachmentBlock(sourceAttachments, {
          removable: true,
          onRemove: removeAttachment,
        })}
      </div>
    ) : null;

  const historyListView = (
    <>
      <ChatPanelHeader
        title="Alter"
        leading={
          <span
            className={`${style.iconStar} ${style.headerIcon}`}
            aria-hidden
          />
        }
        actions={expandToggleBtn}
        onClose={onClose}
        closeTitle="창만 닫기 (진행 중 작업은 계속됩니다)"
      />
      <div className={chatUiStyle.listShell}>
        <div className={chatUiStyle.listItems}>
          {error && <div className={style.error}>{error}</div>}
          {historyLoading ? (
            <div className={chatUiStyle.loading}>불러오는 중…</div>
          ) : conversations.length === 0 ? (
            <ChatEmptyState
              icon={
                <span
                  className={style.iconStar}
                  style={{ width: 40, height: 40 }}
                  aria-hidden
                />
              }
              title="저장된 대화가 없습니다"
              subtitle="새 대화를 시작해 Alter와 이야기해 보세요."
              action={
                <Button
                  type="ghost"
                  onClick={startNewConversation}
                  disabled={isWorking}
                >
                  새 대화 시작하기
                </Button>
              }
            />
          ) : (
            conversations.map((c) => {
              const skillName = skillLabel(c.lastSkill);
              const isRenaming = renamingId === c._id;
              return (
                <ChatListRow
                  key={c._id}
                  title={conversationListTitle(c)}
                  count={c.messageCount}
                  time={`${c.status === "working" ? "진행 중 · " : ""}${formatAlterListTime(c.lastMessageAt)}`}
                  preview={
                    c.lastMessagePreview || c.seasonLabel ? (
                      <>
                        {c.lastMessagePreview ? (
                          <span className={style.listPreviewText}>
                            {c.lastMessagePreview}
                          </span>
                        ) : null}
                        {c.lastMessagePreview && c.seasonLabel ? " · " : null}
                        {c.seasonLabel ? (
                          <span className={style.listSeasonTag}>
                            {c.seasonLabel}
                          </span>
                        ) : null}
                      </>
                    ) : undefined
                  }
                  active={conversationId === c._id}
                  leading={
                    skillName ? (
                      <span
                        className={style.skillTag}
                        aria-label={`스킬 ${skillName}`}
                      >
                        {skillName}
                      </span>
                    ) : (
                      <span
                        className={style.iconStar}
                        style={{ width: 28, height: 28 }}
                        aria-hidden
                      />
                    )
                  }
                  onClick={() => void openConversation(c._id, c)}
                  titleEdit={
                    isRenaming
                      ? {
                          value: renameDraft,
                          onChange: setRenameDraft,
                          onSubmit: () => void submitRenameConversation(),
                          onCancel: cancelRenameConversation,
                        }
                      : undefined
                  }
                  menuItems={[
                    {
                      key: "rename",
                      label: "이름 변경",
                      icon: <Svg type="edit" width="16px" height="16px" />,
                      onClick: () => beginRenameConversation(c),
                    },
                    {
                      key: "delete",
                      label: "삭제",
                      danger: true,
                      icon: <Svg type="trash" width="16px" height="16px" />,
                      onClick: () => void deleteConversation(c._id),
                    },
                  ]}
                />
              );
            })
          )}
        </div>
        <div className={chatUiStyle.listFooter}>
          <Button
            type="ghost"
            onClick={startNewConversation}
            disabled={isWorking}
            style={{ width: "100%" }}
          >
            새 대화
          </Button>
        </div>
      </div>
    </>
  );

  const conversationView = (
    <>
      <ChatPanelHeader
        title={conversationTitle || "새 대화"}
        subtitle={isWorking ? "진행 중" : undefined}
        onBack={openHistoryList}
        actions={
          <>
            {isWorking && (
              <button
                type="button"
                className={style.actionBtn}
                onClick={cancelWorking}
              >
                중단
              </button>
            )}
            {expandToggleBtn}
          </>
        }
        onClose={onClose}
        closeTitle="창만 닫기 (진행 중 작업은 계속됩니다)"
      />

      <div className={style.contextBar}>
        현재 화면: {contextLabel}
        {currentRegistration?.role
          ? ` · ${currentRegistration.role === "teacher" ? "교사" : "학생"}`
          : ""}
      </div>

      <div className={style.body}>
        {error && <div className={style.error}>{error}</div>}

        {messages.length === 0 && !inPrep && (
          <ChatEmptyState
            icon={
              <Svg
                type="send"
                width="40px"
                height="40px"
                style={{ fill: "var(--accent-4, #ccc)" }}
              />
            }
            title="메시지를 보내보세요"
            subtitle="Alter에게 질문하거나 추천 Skill로 작업을 시작할 수 있습니다. 대화는 자동 저장되며, 창을 닫아도 진행 중 작업은 이어집니다."
          />
        )}

        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            variant={msg.role === "user" ? "own" : "other"}
            wide={!!msg.draft}
            time={formatBubbleTime(msg.createdAt)}
            sender={
              <>
                {msg.role === "user" ? "나" : "Alter"}
                {msg.skill ? (
                  <span className={style.skillTag}>{skillLabel(msg.skill)}</span>
                ) : null}
              </>
            }
          >
            {msg.role === "user" && msg.attachments?.length
              ? renderAttachmentBlock(msg.attachments)
              : null}
            {msg.content ? (
              msg.role === "assistant" ? (
                <MarkdownViewer
                  content={normalizeAlterMarkdown(msg.content)}
                  className={style.mdContent}
                />
              ) : (
                <div className={style.msgText}>{msg.content}</div>
              )
            ) : null}
            {msg.draft && isSyllabusDraft(msg.draft) && (
              <div className={style.reviewList}>
                <div className={style.reviewItem}>
                  <div className={style.reviewHeader}>
                    <span>수업 초안 미리보기</span>
                    <span className={`${style.levelChip} ${style.levelFair}`}>
                      {(msg.draft.items || []).filter((it) => it.value).length}/
                      {(msg.draft.items || []).length}항목
                    </span>
                  </div>
                  <div className={style.draftPreviewList}>
                    {(msg.draft.items || [])
                      .filter((it) => it.value)
                      .map((item) => (
                        <div
                          key={`${msg.id}-${item.field}`}
                          className={style.draftFieldBlock}
                        >
                          <p className={style.draftFieldLabel}>{item.field}</p>
                          <p className={style.draftFieldValue}>{item.value}</p>
                        </div>
                      ))}
                  </div>
                  <div className={style.draftActions}>
                    {pageContext?.applyInfoDraft && (
                      <button
                        type="button"
                        className={style.applyBtn}
                        disabled={appliedDraftIds.has(msg.id)}
                        onClick={() => applyDraft(msg.id, msg.draft!)}
                      >
                        {appliedDraftIds.has(msg.id)
                          ? "반영됨"
                          : "전체에 반영"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {msg.draft && isEvalDraft(msg.draft) && (
              <div className={style.reviewList}>
                <div className={style.reviewItem}>
                  <div className={style.reviewHeader}>
                    <span>평가 초안 미리보기</span>
                    <span className={`${style.levelChip} ${style.levelFair}`}>
                      {msg.draft.rows?.length || 0}명
                    </span>
                  </div>
                  <p className={style.reviewComment}>
                    항목: {(msg.draft.targetLabels || []).join(", ") || "-"}
                    {msg.draft.fillEmptyOnly !== false
                      ? " · 빈 칸만 반영"
                      : " · 덮어쓰기 가능"}
                  </p>
                  <div className={style.draftPreviewList}>
                    {(msg.draft.rows || []).map((row) => {
                      const fromCtx = (
                        pageContext?.getEvaluationRows?.() || []
                      ).find((r) => r.studentId === row.studentId);
                      const name =
                        row.studentName ||
                        fromCtx?.studentName ||
                        row.studentId;
                      const grade =
                        row.studentGrade || fromCtx?.studentGrade || "";
                      const labels = msg.draft && isEvalDraft(msg.draft)
                        ? msg.draft.targetLabels?.length
                          ? msg.draft.targetLabels
                          : Object.keys(row.values || {})
                        : [];
                      return (
                        <div
                          key={`${msg.id}-${row.studentId}`}
                          className={style.draftStudentCard}
                        >
                          <div className={style.draftStudentMeta}>
                            <span>
                              {grade ? `${grade} ` : ""}
                              {name}
                            </span>
                            <span className={style.draftStudentId}>
                              {row.studentId}
                            </span>
                          </div>
                          {labels.map((label) => {
                            const value = row.values?.[label];
                            if (value == null || String(value).trim() === "") {
                              return null;
                            }
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
                  <div className={style.draftActions}>
                    {pageContext?.applyEvaluationCsv && (
                      <button
                        type="button"
                        className={style.applyBtn}
                        disabled={appliedDraftIds.has(msg.id)}
                        onClick={() => applyDraft(msg.id, msg.draft!)}
                      >
                        {appliedDraftIds.has(msg.id)
                          ? "반영됨"
                          : "미리보기 반영"}
                      </button>
                    )}
                    {isEvalDraft(msg.draft) && msg.draft.csv && (
                      <button
                        type="button"
                        className={style.applyBtn}
                        onClick={() => {
                          const csv = isEvalDraft(msg.draft)
                            ? msg.draft.csv
                            : "";
                          const blob = new Blob(["\uFEFF" + csv], {
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
                    )}
                  </div>
                </div>
              </div>
            )}
            {msg.draft && isArchiveDraft(msg.draft) && (
              <div className={style.reviewList}>
                <div className={style.reviewItem}>
                  <div className={style.reviewHeader}>
                    <span>기록 초안 미리보기</span>
                    <span className={`${style.levelChip} ${style.levelFair}`}>
                      {msg.draft.rows?.length || 0}명
                    </span>
                  </div>
                  <p className={style.reviewComment}>
                    항목: {(msg.draft.targetLabels || []).join(", ") || "-"}
                    {msg.draft.writeMode === "sameText"
                      ? " · 동일 문구"
                      : " · 학생별"}
                    {msg.draft.fillEmptyOnly !== false
                      ? " · 빈 칸만 반영"
                      : " · 덮어쓰기 가능"}
                  </p>
                  <div className={style.draftPreviewList}>
                    {(msg.draft.rows || []).map((row) => {
                      const fromCtx = (
                        pageContext?.getArchiveRows?.() || []
                      ).find((r) => r.studentId === row.studentId);
                      const name =
                        row.studentName ||
                        fromCtx?.studentName ||
                        row.studentId;
                      const grade =
                        row.studentGrade || fromCtx?.studentGrade || "";
                      const labels =
                        msg.draft && isArchiveDraft(msg.draft)
                          ? msg.draft.targetLabels?.length
                            ? msg.draft.targetLabels
                            : Object.keys(row.values || {})
                          : [];
                      return (
                        <div
                          key={`${msg.id}-arch-${row.studentId}`}
                          className={style.draftStudentCard}
                        >
                          <div className={style.draftStudentMeta}>
                            <span>
                              {grade ? `${grade} ` : ""}
                              {name}
                            </span>
                            <span className={style.draftStudentId}>
                              {row.studentId}
                            </span>
                          </div>
                          {labels.map((label) => {
                            const value = row.values?.[label];
                            if (value == null || String(value).trim() === "") {
                              return null;
                            }
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
                  <div className={style.draftActions}>
                    {pageContext?.applyArchiveDraft && (
                      <button
                        type="button"
                        className={style.applyBtn}
                        disabled={appliedDraftIds.has(msg.id)}
                        onClick={() => applyDraft(msg.id, msg.draft!)}
                      >
                        {appliedDraftIds.has(msg.id)
                          ? "반영됨"
                          : "미리보기 반영"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {msg.draft && isDocumentDraft(msg.draft) && (() => {
              const docDraft = msg.draft as TAlterDocumentDraftResult;
              const docTypeLabel =
                DOCUMENT_DOC_TYPES.find((t) => t.id === docDraft.docType)
                  ?.label || docDraft.docType;
              return (
              <div className={style.reviewList}>
                <div className={style.reviewItem}>
                  <div className={style.reviewHeader}>
                    <span>문서 초안 미리보기</span>
                    <span className={`${style.levelChip} ${style.levelFair}`}>
                      {docDraft.writeMode === "refine" ? "다듬기" : "새 작성"}
                    </span>
                  </div>
                  <p className={style.reviewComment}>
                    제목: {docDraft.title || "-"}
                    {docTypeLabel ? ` · ${docTypeLabel}` : ""}
                    {" · 전체에 덮어쓰기"}
                  </p>
                  <div className={style.draftPreviewList}>
                    <div className={style.draftFieldBlock}>
                      <p className={style.draftFieldLabel}>본문</p>
                      <p
                        className={style.draftFieldValue}
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {(docDraft.content || "").slice(0, 2500)}
                        {(docDraft.content || "").length > 2500 ? "…" : ""}
                      </p>
                    </div>
                  </div>
                  <div className={style.draftActions}>
                    {pageContext?.applyDocumentDraft && (
                      <button
                        type="button"
                        className={style.applyBtn}
                        onClick={() => applyDraft(msg.id, docDraft)}
                      >
                        {appliedDraftIds.has(msg.id)
                          ? "다시 반영"
                          : "전체에 반영"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}
            {msg.draft && isActivityDraft(msg.draft) && (() => {
              const actDraft = msg.draft as TAlterActivityDraftResult;
              const formTypeLabel =
                ACTIVITY_FORM_TYPES.find((t) => t.id === actDraft.formType)
                  ?.label || actDraft.formType;
              const fieldPreview = (actDraft.fields || [])
                .slice(0, 12)
                .map((f) => {
                  const t = String(f.type || "");
                  const label = String(f.label || "(제목 없음)");
                  return `${label} · ${t}`;
                });
              const settings = actDraft.settings || {};
              const modeBits = [
                settings.quizMode ? "퀴즈" : null,
                settings.assessmentMode ? "평가" : null,
                settings.requiredMode ? "필수 응답" : null,
                settings.allowMultipleResponses ? "복수 응답" : null,
              ].filter(Boolean);
              return (
              <div className={style.reviewList}>
                <div className={style.reviewItem}>
                  <div className={style.reviewHeader}>
                    <span>활동 초안 미리보기</span>
                    <span className={`${style.levelChip} ${style.levelFair}`}>
                      {actDraft.writeMode === "refine" ? "다듬기" : "새 작성"}
                    </span>
                  </div>
                  <p className={style.reviewComment}>
                    제목: {actDraft.title || "-"}
                    {formTypeLabel ? ` · ${formTypeLabel}` : ""}
                    {" · 필드 "}
                    {(actDraft.fields || []).length}개
                    {(actDraft.rubrics || []).length > 0
                      ? ` · 루브릭 ${(actDraft.rubrics || []).length}개`
                      : ""}
                    {modeBits.length > 0 ? ` · ${modeBits.join(", ")}` : ""}
                    {" · 전체에 덮어쓰기"}
                  </p>
                  {actDraft.description ? (
                    <p className={style.prepText}>{actDraft.description}</p>
                  ) : null}
                  <div className={style.draftPreviewList}>
                    <div className={style.draftFieldBlock}>
                      <p className={style.draftFieldLabel}>필드</p>
                      <p
                        className={style.draftFieldValue}
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {fieldPreview.join("\n") || "(없음)"}
                        {(actDraft.fields || []).length > 12 ? "\n…" : ""}
                      </p>
                    </div>
                  </div>
                  <div className={style.draftActions}>
                    {pageContext?.applyActivityDraft && (
                      <button
                        type="button"
                        className={style.applyBtn}
                        onClick={() => applyDraft(msg.id, actDraft)}
                      >
                        {appliedDraftIds.has(msg.id)
                          ? "다시 반영"
                          : "전체에 반영"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })()}
            {msg.draft && isAssessmentGradeDraft(msg.draft) && (() => {
              const gDraft = msg.draft as TAlterAssessmentGradeDraftResult;
              const fieldEntries = Object.entries(gDraft.byField || {});
              const gradeFields =
                pageContext?.getAssessmentGradeContext?.()?.fields || [];
              const previewLines = fieldEntries.slice(0, 8).map(([fid, g]) => {
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
                return `${label}: ${levelBits.join(", ") || "초안"}${
                  comment ? ` — ${comment.slice(0, 60)}` : ""
                }`;
              });
              return (
                <div className={style.reviewList}>
                  <div className={style.reviewItem}>
                    <div className={style.reviewHeader}>
                      <span>채점 초안 미리보기</span>
                      <span className={`${style.levelChip} ${style.levelFair}`}>
                        {gDraft.fillEmptyOnly ? "빈 칸만" : "덮어쓰기"}
                      </span>
                    </div>
                    <p className={style.reviewComment}>
                      항목 {fieldEntries.length}개
                      {gDraft.final?.comment
                        ? ` · 총평 ${String(gDraft.final.comment).slice(0, 40)}`
                        : ""}
                    </p>
                    <div className={style.draftPreviewList}>
                      <div className={style.draftFieldBlock}>
                        <p className={style.draftFieldLabel}>채점</p>
                        <p
                          className={style.draftFieldValue}
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {previewLines.join("\n") || "(없음)"}
                          {fieldEntries.length > 8 ? "\n…" : ""}
                        </p>
                      </div>
                    </div>
                    <div className={style.draftActions}>
                      {pageContext?.applyGradeDraft && (
                        <button
                          type="button"
                          className={style.applyBtn}
                          onClick={() => applyDraft(msg.id, gDraft)}
                        >
                          {appliedDraftIds.has(msg.id)
                            ? "다시 반영"
                            : "채점에 반영"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </ChatMessageBubble>
        ))}

        {isWorking && steps.length > 0 && (
          <ChatMessageBubble variant="other" sender="Alter">
            <div className={style.steps}>
              {steps.map((s, i) => (
                <div key={`${s}-${i}`}>• {s}</div>
              ))}
            </div>
          </ChatMessageBubble>
        )}
        <div ref={endRef} />
      </div>

      <div className={style.skillDock}>
        <div className={style.skillDockHeader}>
          <div className={style.skillRow}>
            {skillChips.map((skill) => (
              <button
                key={skill}
                type="button"
                className={`${style.skillChip} ${
                  (
                    isDraftPrepSkill(skill)
                      ? showPrep && selectedSkill === skill
                      : selectedSkill === skill && !showPrep
                  )
                    ? style.active
                    : ""
                }`}
                onClick={() => selectSkill(skill)}
                disabled={isWorking}
              >
                {SKILL_LABEL[skill]}
              </button>
            ))}
          </div>
          {inPrep && (
            <button
              type="button"
              className={style.prepCollapseBtn}
              onClick={() => setPrepCollapsed((v) => !v)}
              aria-expanded={!prepCollapsed}
            >
              {prepCollapsed ? "설정 펼치기" : "설정 접기"}
            </button>
          )}
        </div>
        {inPrep && !prepCollapsed && (
          <div className={style.prepScroll}>
        {inDocPrep && (
          <>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>작성 모드</p>
              <div className={style.refList}>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="docWriteMode"
                    checked={docWriteMode === "create"}
                    onChange={() => setDocWriteMode("create")}
                  />
                  <span>새로 작성</span>
                </label>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="docWriteMode"
                    checked={docWriteMode === "refine"}
                    onChange={() => setDocWriteMode("refine")}
                  />
                  <span>기존 글 다듬기</span>
                </label>
              </div>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                문서 형태
                <PrepHint text="형태에 맞게 제목·목록·표·체크리스트 등 에디터 문법을 활용한 초안을 만듭니다." />
              </p>
              <div className={style.refList}>
                {DOCUMENT_DOC_TYPES.map((t) => (
                  <label key={t.id} className={style.refRow}>
                    <input
                      type="radio"
                      name="docType"
                      checked={docType === t.id}
                      onChange={() => setDocType(t.id)}
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                작성 지침
                <PrepHint text="학교 AI 라이브러리의 지침 중 이번 문서에 쓸 항목을 고릅니다." />
              </p>
              {skillSettingsLoading ? (
                <p className={style.prepText}>지침을 불러오는 중...</p>
              ) : docGuidelineItems.length === 0 ? (
                <p className={style.prepText}>
                  선택 가능한 지침이 없습니다. 관리 → 학교 AI → 라이브러리에서
                  「문서」 지침을 추가해 주세요. 기본 기준으로 작성합니다.
                </p>
              ) : (
                <div className={style.refList}>
                  {docGuidelineItems.map((item) => (
                    <GuidelinePickRow
                      key={item._id}
                      id={item._id}
                      title={item.title}
                      content={item.content}
                      checked={docSelectedGuidelineIds.includes(item._id)}
                      expanded={expandedGuidelineId === item._id}
                      onToggleChecked={() =>
                        toggleLabel(
                          item._id,
                          docSelectedGuidelineIds,
                          setDocSelectedGuidelineIds
                        )
                      }
                      onToggleExpanded={() =>
                        setExpandedGuidelineId((cur) =>
                          cur === item._id ? null : item._id
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
            <div className={style.prepHintRow}>
              <PrepHint text="초안은 에디터 전체를 덮어씁니다. 미리보기 확인 후 「전체에 반영」하고 저장하세요." />
              <span className={style.prepHintRowLabel}>이용 안내</span>
            </div>
          </>
        )}

        {inActivityPrep && (
          <>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>작성 모드</p>
              <div className={style.refList}>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="activityWriteMode"
                    checked={activityWriteMode === "create"}
                    onChange={() => setActivityWriteMode("create")}
                  />
                  <span>새로 작성</span>
                </label>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="activityWriteMode"
                    checked={activityWriteMode === "refine"}
                    onChange={() => setActivityWriteMode("refine")}
                  />
                  <span>기존 양식 다듬기</span>
                </label>
              </div>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                활동 형태
                <PrepHint text="형태에 맞게 일반 응답 필드·설정을 중심으로 초안을 만듭니다. html-app은 제출이 필요 없는 체험용일 때만 씁니다." />
              </p>
              <div className={style.refList}>
                {ACTIVITY_FORM_TYPES.map((t) => (
                  <label key={t.id} className={style.refRow}>
                    <input
                      type="radio"
                      name="activityFormType"
                      checked={activityFormType === t.id}
                      onChange={() => setActivityFormType(t.id)}
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                작성 지침
                <PrepHint text="학교 AI 라이브러리의 지침 중 이번 활동에 쓸 항목을 고릅니다." />
              </p>
              {skillSettingsLoading ? (
                <p className={style.prepText}>지침을 불러오는 중...</p>
              ) : activityGuidelineItems.length === 0 ? (
                <p className={style.prepText}>
                  선택 가능한 지침이 없습니다. 관리 → 학교 AI → 라이브러리에서
                  「활동」 지침을 추가해 주세요. 기본 기준으로 작성합니다.
                </p>
              ) : (
                <div className={style.refList}>
                  {activityGuidelineItems.map((item) => (
                    <GuidelinePickRow
                      key={item._id}
                      id={item._id}
                      title={item.title}
                      content={item.content}
                      checked={activitySelectedGuidelineIds.includes(item._id)}
                      expanded={expandedGuidelineId === item._id}
                      onToggleChecked={() =>
                        toggleLabel(
                          item._id,
                          activitySelectedGuidelineIds,
                          setActivitySelectedGuidelineIds
                        )
                      }
                      onToggleExpanded={() =>
                        setExpandedGuidelineId((cur) =>
                          cur === item._id ? null : item._id
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
            <div className={style.prepHintRow}>
              <PrepHint text="초안은 양식 필드·설정을 덮어씁니다. 미리보기 확인 후 「전체에 반영」하고 저장하세요." />
              <span className={style.prepHintRowLabel}>이용 안내</span>
            </div>
          </>
        )}

        {inGradePrep && (
          <>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>채점 대상</p>
              <p className={style.prepText}>
                {pageContext?.label || "현재 문서 보기의 응답"}
              </p>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>반영 방식</p>
              <div className={style.refList}>
                <label className={style.refRow}>
                  <input
                    type="checkbox"
                    checked={gradeFillEmptyOnly}
                    onChange={(e) => setGradeFillEmptyOnly(e.target.checked)}
                  />
                  <span>이미 채점한 칸은 유지 (빈 칸만 채움)</span>
                </label>
              </div>
            </div>
            <div className={style.prepHintRow}>
              <PrepHint text="초안은 문서 보기 채점 칸에만 반영됩니다. 확인 후 「채점 저장」또는 「평가 확정」을 눌러 주세요." />
              <span className={style.prepHintRowLabel}>이용 안내</span>
            </div>
          </>
        )}

        {inSyllabusPrep && (
          <>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>학교 작성 지침</p>
              <p className={style.prepText}>
                {skillSettingsLoading
                  ? "지침을 불러오는 중..."
                  : guidelines ||
                    "학교에 선택된 작성 지침이 없습니다. 기본 기준으로 작성합니다. (관리 → 학교 AI → 라이브러리)"}
              </p>
            </div>
            <div className={style.prepHintRow}>
              <PrepHint text="정보를 입력·첨부한 뒤 「초안 작성」을 누르면 학습 계획서 전 항목 초안을 만듭니다. 미리보기 확인 후 「전체에 반영」하세요." />
              <span className={style.prepHintRowLabel}>이용 안내</span>
            </div>
          </>
        )}

        {inEvalPrep && (
          <>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>작성할 항목</p>
              {teacherEditableFields.length === 0 ? (
                <p className={style.prepText}>
                  교사 편집이 가능한 평가 항목이 없습니다.
                </p>
              ) : (
                <div className={style.refList}>
                  {teacherEditableFields.map((field) => (
                    <label key={field.label} className={style.refRow}>
                      <input
                        type="checkbox"
                        checked={evalTargetLabels.includes(field.label)}
                        onChange={() =>
                          toggleLabel(
                            field.label,
                            evalTargetLabels,
                            setEvalTargetLabels
                          )
                        }
                      />
                      <span>
                        {field.label}
                        {field.type !== "input" ? ` (${field.type})` : ""}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                참고할 항목
                <PrepHint text="자기평가와 기존 멘토평가를 함께 참고하면, 둘을 종합한 새 멘토평가 초안을 만듭니다. 원문은 복사되지 않도록 재작성합니다." />
              </p>
              {allEvalLabels.length === 0 ? (
                <p className={style.prepText}>참고할 항목이 없습니다.</p>
              ) : (
                <div className={style.refList}>
                  {allEvalLabels.map((label) => {
                    const isTarget = evalTargetLabels.includes(label);
                    return (
                      <label key={label} className={style.refRow}>
                        <input
                          type="checkbox"
                          checked={evalContextLabels.includes(label)}
                          onChange={() =>
                            toggleLabel(
                              label,
                              evalContextLabels,
                              setEvalContextLabels
                            )
                          }
                        />
                        <span>
                          {label}
                          {isTarget ? " (작성 대상·기존 내용)" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                범위
                {!evalFillEmptyOnly ? (
                  <PrepHint text="종합 재작성 모드: 참고 항목을 합쳐 작성 항목을 새로 씁니다. 「빈 칸만 채우기」를 끄면 기존 내용을 덮어씁니다." />
                ) : null}
              </p>
              <div className={style.refList}>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="evalScope"
                    checked={evalScope === "empty"}
                    onChange={() => setEvalScope("empty")}
                  />
                  <span>미작성 행만</span>
                </label>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="evalScope"
                    checked={evalScope === "all"}
                    onChange={() => setEvalScope("all")}
                  />
                  <span>전체 학생 목록</span>
                </label>
                <label className={style.refRow}>
                  <input
                    type="checkbox"
                    checked={evalFillEmptyOnly}
                    onChange={(e) => setEvalFillEmptyOnly(e.target.checked)}
                  />
                  <span>빈 칸만 채우기</span>
                </label>
              </div>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                학생 선택
                <PrepHint
                  text={`한 번에 최대 ${EVAL_DRAFT_MAX}명까지 선택해 초안을 만들 수 있습니다. 나눠서 여러 번 실행할 수 있습니다.`}
                />
              </p>
              {evalCandidateStudents.length === 0 ? (
                <p className={style.prepText}>
                  {evalScope === "empty"
                    ? "채울 빈 칸이 있는 학생이 없습니다."
                    : "선택 가능한 학생이 없습니다."}
                </p>
              ) : (
                <>
                  <div className={style.prepActions}>
                    <button
                      type="button"
                      className={style.prepActionBtn}
                      onClick={selectDefaultStudentBatch}
                    >
                      기본 {EVAL_DRAFT_DEFAULT_BATCH}명
                    </button>
                    <button
                      type="button"
                      className={style.prepActionBtn}
                      onClick={selectAllCandidateStudents}
                    >
                      전체
                      {evalCandidateStudents.length > EVAL_DRAFT_MAX
                        ? ` (최대 ${EVAL_DRAFT_MAX})`
                        : ""}
                    </button>
                    <button
                      type="button"
                      className={style.prepActionBtn}
                      onClick={() => setEvalSelectedStudentIds([])}
                    >
                      선택 해제
                    </button>
                  </div>
                  <div className={`${style.refList} ${style.refListScroll}`}>
                    {evalCandidateStudents.map((student) => {
                      const checked = evalSelectedIds.includes(
                        student.studentId
                      );
                      const atLimit =
                        !checked && evalSelectedIds.length >= EVAL_DRAFT_MAX;
                      return (
                        <label
                          key={student.studentId}
                          className={style.refRow}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={atLimit}
                            onChange={() => toggleStudentId(student.studentId)}
                          />
                          <span>
                            {student.studentGrade
                              ? `${student.studentGrade} · `
                              : ""}
                            {student.studentName || "(이름 없음)"}
                            <span className={style.prepMuted}>
                              {" "}
                              ({student.studentId})
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className={style.prepText}>
                    선택 {evalSelectedIds.length}명
                    {evalCandidateStudents.length > evalSelectedIds.length
                      ? ` · 후보 ${evalCandidateStudents.length}명`
                      : ""}
                  </p>
                </>
              )}
            </div>
            {(skillSettingsLoading || guidelines) && (
              <div className={style.prepCard}>
                <p className={style.prepLabel}>학교 작성 지침</p>
                <p className={style.prepText}>
                  {skillSettingsLoading
                    ? "지침을 불러오는 중..."
                    : guidelines}
                </p>
              </div>
            )}
            <div className={style.prepHintRow}>
              <PrepHint text="참고(자기평가·기존 멘토평가) → 작성(멘토평가)로 종합 초안을 만듭니다. 학생을 고른 뒤 「초안 작성」을 누르세요. 반영 후에도 행별 저장이 필요합니다." />
              <span className={style.prepHintRowLabel}>이용 안내</span>
            </div>
          </>
        )}

        {inArchivePrep && (
          <>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>작성 모드</p>
              <div className={style.refList}>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="archiveWriteMode"
                    checked={archiveWriteMode === "perStudent"}
                    onChange={() => setArchiveWriteMode("perStudent")}
                  />
                  <span>학생별 차별 작성</span>
                </label>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="archiveWriteMode"
                    checked={archiveWriteMode === "sameText"}
                    onChange={() => setArchiveWriteMode("sameText")}
                  />
                  <span>선택 학생 동일 문구</span>
                </label>
              </div>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>작성할 항목</p>
              {archiveInputFields.length === 0 ? (
                <p className={style.prepText}>
                  텍스트(input) 기록 항목이 없습니다.
                </p>
              ) : (
                <div className={style.refList}>
                  {archiveInputFields.map((field) => (
                    <label key={field.label} className={style.refRow}>
                      <input
                        type="checkbox"
                        checked={archiveTargetLabels.includes(field.label)}
                        onChange={() =>
                          toggleLabel(
                            field.label,
                            archiveTargetLabels,
                            setArchiveTargetLabels
                          )
                        }
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                참고할 항목
                <PrepHint text="이미 작성된 기록 내용을 참고해 초안을 만듭니다. 문장을 그대로 복사하지 않고 종합·재작성합니다. 작성 대상 항목의 기존 내용도 여기에 포함하면 이어서 다듬을 수 있습니다." />
              </p>
              {archiveReferenceFields.length === 0 ? (
                <p className={style.prepText}>참고할 항목이 없습니다.</p>
              ) : (
                <div className={style.refList}>
                  {archiveReferenceFields.map((field) => {
                    const isTarget = archiveTargetLabels.includes(field.label);
                    return (
                      <label key={field.label} className={style.refRow}>
                        <input
                          type="checkbox"
                          checked={archiveContextLabels.includes(field.label)}
                          onChange={() =>
                            toggleLabel(
                              field.label,
                              archiveContextLabels,
                              setArchiveContextLabels
                            )
                          }
                        />
                        <span>
                          {field.label}
                          {field.type !== "input" ? ` (${field.type})` : ""}
                          {isTarget ? " (작성 대상·기존 내용)" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                작성 지침
                <PrepHint text="학교 AI 라이브러리의 지침 중 이번 작성에 쓸 항목을 고릅니다. 기록 양식마다 다른 지침을 골라 쓸 수 있습니다." />
              </p>
              {skillSettingsLoading ? (
                <p className={style.prepText}>지침을 불러오는 중...</p>
              ) : archiveGuidelineItems.length === 0 ? (
                <p className={style.prepText}>
                  선택 가능한 지침이 없습니다. 관리 → 학교 AI → 라이브러리에서
                  「기록」 지침을 추가해 주세요. 기본 기준으로 작성합니다.
                </p>
              ) : (
                <div className={style.refList}>
                  {archiveGuidelineItems.map((item) => (
                    <GuidelinePickRow
                      key={item._id}
                      id={item._id}
                      title={item.title}
                      content={item.content}
                      checked={archiveSelectedGuidelineIds.includes(item._id)}
                      expanded={expandedGuidelineId === item._id}
                      onToggleChecked={() =>
                        toggleLabel(
                          item._id,
                          archiveSelectedGuidelineIds,
                          setArchiveSelectedGuidelineIds
                        )
                      }
                      onToggleExpanded={() =>
                        setExpandedGuidelineId((cur) =>
                          cur === item._id ? null : item._id
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                범위
                <PrepHint text="「빈 칸만 채우기」가 켜져 있으면 이미 내용이 있는 칸은 건너뜁니다. 표가 비어 보여도 저장된 값이 있으면 제외될 수 있습니다." />
              </p>
              <div className={style.refList}>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="archiveScope"
                    checked={archiveScope === "empty"}
                    onChange={() => {
                      setArchiveScope("empty");
                      setArchiveFillEmptyOnly(true);
                    }}
                  />
                  <span>미작성 학생만</span>
                </label>
                <label className={style.refRow}>
                  <input
                    type="radio"
                    name="archiveScope"
                    checked={archiveScope === "all"}
                    onChange={() => setArchiveScope("all")}
                  />
                  <span>전체 학생 목록</span>
                </label>
                <label className={style.refRow}>
                  <input
                    type="checkbox"
                    checked={archiveFillEmptyOnly}
                    onChange={(e) => setArchiveFillEmptyOnly(e.target.checked)}
                  />
                  <span>빈 칸만 채우기</span>
                </label>
              </div>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>
                학생 선택
                <PrepHint
                  text={`한 번에 최대 ${EVAL_DRAFT_MAX}명까지 선택해 초안을 만들 수 있습니다.`}
                />
              </p>
              {archiveCandidateStudents.length === 0 ? (
                <p className={style.prepText}>
                  {archiveScope === "empty"
                    ? "채울 빈 칸이 있는 학생이 없습니다."
                    : "선택 가능한 학생이 없습니다."}
                </p>
              ) : (
                <>
                  <div className={style.prepActions}>
                    <button
                      type="button"
                      className={style.prepActionBtn}
                      onClick={selectDefaultArchiveStudentBatch}
                    >
                      기본 {EVAL_DRAFT_DEFAULT_BATCH}명
                    </button>
                    <button
                      type="button"
                      className={style.prepActionBtn}
                      onClick={selectAllArchiveCandidateStudents}
                    >
                      전체
                      {archiveCandidateStudents.length > EVAL_DRAFT_MAX
                        ? ` (최대 ${EVAL_DRAFT_MAX})`
                        : ""}
                    </button>
                    <button
                      type="button"
                      className={style.prepActionBtn}
                      onClick={() => setArchiveSelectedStudentIds([])}
                    >
                      선택 해제
                    </button>
                  </div>
                  <div className={`${style.refList} ${style.refListScroll}`}>
                    {archiveCandidateStudents.map((student) => {
                      const checked = archiveSelectedIds.includes(
                        student.studentId
                      );
                      const atLimit =
                        !checked &&
                        archiveSelectedIds.length >= EVAL_DRAFT_MAX;
                      return (
                        <label
                          key={student.studentId}
                          className={style.refRow}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={atLimit}
                            onChange={() =>
                              toggleArchiveStudentId(student.studentId)
                            }
                          />
                          <span>
                            {student.studentGrade
                              ? `${student.studentGrade} · `
                              : ""}
                            {student.studentName || "(이름 없음)"}
                            <span className={style.prepMuted}>
                              {" "}
                              ({student.studentId})
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className={style.prepText}>
                    선택 {archiveSelectedIds.length}명
                    {archiveCandidateStudents.length >
                    archiveSelectedIds.length
                      ? ` · 후보 ${archiveCandidateStudents.length}명`
                      : ""}
                  </p>
                </>
              )}
            </div>
            <div className={style.prepHintRow}>
              <PrepHint text="지침·항목·학생을 고른 뒤 「초안 작성」을 누르세요. 미리보기 반영 후 「변경 사항 저장」으로 DB에 저장합니다." />
              <span className={style.prepHintRowLabel}>이용 안내</span>
            </div>
          </>
        )}
          </div>
        )}
      </div>

      <div className={style.composerWrap}>
        {attachmentChips}
        <ChatInputBar
          bare
          value={draft}
          onChange={setDraft}
          onSend={() => {
            if (inPrep) startSuggested();
            else sendDraft();
          }}
          disabled={isWorking || attachUploading}
          sendDisabled={
            inSyllabusPrep ||
            (inDocPrep && docWriteMode === "create") ||
            (inActivityPrep && activityWriteMode === "create")
              ? isWorking ||
                attachUploading ||
                (!draft.trim() && sourceAttachments.length === 0)
              : inPrep
                ? isWorking || attachUploading
                : isWorking ||
                  attachUploading ||
                  (!draft.trim() && sourceAttachments.length === 0)
          }
          sendActive={
            inSyllabusPrep ||
            (inDocPrep && docWriteMode === "create") ||
            (inActivityPrep && activityWriteMode === "create")
              ? !isWorking &&
                !attachUploading &&
                (!!draft.trim() || sourceAttachments.length > 0)
              : inPrep
                ? !isWorking && !attachUploading
                : (!!draft.trim() || sourceAttachments.length > 0) &&
                  !isWorking &&
                  !attachUploading
          }
          sendTitle={inPrep ? prepPrimaryLabel : "보내기"}
          leftSlot={attachButton}
          showTextarea={
            !inPrep ||
            inEvalPrep ||
            inSyllabusPrep ||
            inArchivePrep ||
            inDocPrep ||
            inActivityPrep ||
            inGradePrep
          }
          centerHint="옵션을 고른 뒤 시작하세요"
          placeholder={
            inGradePrep
              ? "예: 감상문의 구체성을 중심으로, 피드백은 2문장"
              : inActivityPrep
                ? activityWriteMode === "refine"
                  ? "예: 객관식 3문항 추가, 서술형 필드 하나 더"
                  : "예: 수학 복습 퀴즈 5문항, 객관식+단답, 필수 응답"
                : inDocPrep
                  ? docWriteMode === "refine"
                    ? "예: 문장을 더 간결하게, 체크리스트를 추가해 주세요"
                    : "예: 저녁활동 이용 안내 매뉴얼, 공간·수칙·신청 방법 포함"
                  : inArchivePrep
                    ? archiveWriteMode === "sameText"
                      ? "예: 공동체 의식과 배려를 중심으로 2~3문장"
                      : "예: 관찰된 성장과 관계 특성을 학생별로 2~4문장"
                    : inEvalPrep
                      ? "예: 멘토 의견은 2~3문장, 성장 포인트를 중심으로"
                      : inSyllabusPrep
                        ? "예: 주제, 목표, 주차별 활동, 평가 방식을 적어 주세요"
                        : "메시지를 입력하세요 (이미지·파일 붙여넣기 가능)"
          }
          onPaste={handlePasteAttach}
          onKeyDown={
            inPrep
              ? (e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isWorking && !attachUploading) startSuggested();
                  }
                }
              : undefined
          }
        />
      </div>
    </>
  );

  return (
    <ChatPanelShell
      variant={isExpanded ? "expanded" : "default"}
      showOverlay={isOpen}
      onOverlayClick={onClose}
    >
      {showHistory ? historyListView : conversationView}
    </ChatPanelShell>
  );
};

export default AlterPanel;
