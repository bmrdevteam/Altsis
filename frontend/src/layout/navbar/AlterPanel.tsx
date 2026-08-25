import {
  ClipboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "contexts/authContext";
import { TAlterSkillId, useAlter } from "contexts/alterContext";
import { MESSAGE } from "hooks/_message";
import useAPIv2 from "hooks/useAPIv2";
import { isEmptyEval } from "utils/evaluationCsv";
import { TAlterConversation } from "types/alterChat";
import { TMyAiUsage } from "types/dashboard";
import AiUsageBar from "components/ai/AiUsageBar";
import Button from "components/button/Button";
import { getUsageMeter } from "utils/aiUsageMeter";
import { MarkdownViewer } from "components/markdown";
import normalizeAlterMarkdown from "utils/normalizeAlterMarkdown";
import { FORM_RESPONSE_WRITABLE_TYPES } from "utils/formResponseDraft";
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
import {
  EVAL_DRAFT_DEFAULT_BATCH,
  EVAL_DRAFT_MAX,
  SkillDraftResult,
  SkillPrepDock,
  isActivityDraft,
  isArchiveDraft,
  isAssessmentGradeDraft,
  isDocumentDraft,
  isEvalDraft,
  isFormDraft,
  isFormResponseDraft,
  isSyllabusDraft,
  prepKindFromSkill,
  prepPrimaryLabel as prepPrimaryLabelFor,
  SKILL_CHIP_HINT,
  SKILL_TONE_KEY,
  alterModeLabel,
  resolveSendSkill,
  buildPrepSummaryParts,
  buildRefineContentExcerpt,
  canActivateRefinePrompt,
  fullscreenToggleLabel,
  shouldDefaultCollapsePrep,
  docTypeLabel,
  activityFormTypeLabel,
  adminFormTypeLabel,
  useAlterGuidelineLibrary,
  AlterGuideLinks,
  type TAlterGuideLink,
  type TAlterDraftResult,
  type TAlterDocumentReviewResult,
} from "./alterUi";
import { ALTER_CHAT_SNAPSHOT_PROFILES } from "utils/alterChatSnapshot";
import style from "./Alter.module.scss";

/** 기본 스냅샷 한도(50)를 넘길 때만 「데이터 확대」뱃지를 노출 */
const DATA_EXPAND_BADGE_MIN_TOTAL =
  ALTER_CHAT_SNAPSHOT_PROFILES.default.MAX_ITEMS;

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
  review?: TAlterDocumentReviewResult | null;
  links?: TAlterGuideLink[];
  createdAt?: string;
  /** 전송 직후 말풍선에 바로 보이는 첨부(미리보기) */
  attachments?: TAlterAttachment[];
};

const SKILL_LABEL: Record<TAlterSkillId, string> = {
  chat: "챗봇",
  "syllabus-draft": "수업",
  "evaluation-draft": "평가",
  "archive-draft": "기록",
  "document-draft": "문서",
  "document-review": "문서 점검",
  "form-response-draft": "응답",
  "activity-draft": "활동",
  "form-draft": "양식",
  "assessment-grade": "채점",
};

const isDraftPrepSkill = (skill: TAlterSkillId) =>
  skill === "syllabus-draft" ||
  skill === "evaluation-draft" ||
  skill === "archive-draft" ||
  skill === "document-draft" ||
  skill === "document-review" ||
  skill === "form-response-draft" ||
  skill === "activity-draft" ||
  skill === "form-draft" ||
  skill === "assessment-grade";

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

const skillToneClass = (skill?: string) =>
  style[SKILL_TONE_KEY[normalizeSkillId(skill)]];

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

type Props = {
  onClose: () => void;
};

/** 요청 Skill에 맞게 history를 줄여 문맥 오염을 막는다 */
const buildHistoryForSkill = (
  msgs: ChatMessage[],
  skill: TAlterSkillId
): Array<{ role: string; content: string }> => {
  const clip = (s: string, max: number) =>
    s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`;

  const rows = msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => {
      let content =
        m.content ||
        (m.attachments?.length
          ? m.attachments.map((a) => `[첨부: ${a.name}]`).join(" ")
          : "");
      const msgSkill = (m.skill || "chat") as TAlterSkillId;
      if (
        skill === "chat" &&
        m.role === "assistant" &&
        (m.draft || m.review || (msgSkill !== "chat" && isDraftPrepSkill(msgSkill)))
      ) {
        const label = SKILL_LABEL[msgSkill] || msgSkill;
        const brief = content ? clip(content, 200) : "";
        content = brief
          ? `[이전 ${label} 결과] ${brief}`
          : `[이전 ${label} 결과]`;
      }
      return { role: m.role, content, skill: msgSkill };
    });

  if (skill === "chat") {
    return rows.slice(-12).map(({ role, content }) => ({ role, content }));
  }

  // draft/채점: 동일 skill + chat 위주, 짧게
  const filtered = rows.filter(
    (m) => m.skill === skill || m.skill === "chat" || !m.skill
  );
  return filtered.slice(-8).map(({ role, content }) => ({ role, content }));
};

const AlterPanel = ({ onClose }: Props) => {
  const { currentSeason, currentRegistration, currentSchool } = useAuth();
  const { AIAPI } = useAPIv2();
  const {
    pageContext,
    isFullscreen,
    isOpen,
    toggleFullscreen,
    setIsWorking: setAlterWorking,
    setHasBackgroundResult,
  } = useAlter();

  const suggested = useMemo(
    () =>
      pageContext?.suggestedSkills?.length
        ? pageContext.suggestedSkills
        : (["chat"] as TAlterSkillId[]),
    [pageContext?.suggestedSkills]
  );

  const [selectedSkill, setSelectedSkill] = useState<TAlterSkillId>(
    suggested[0] || "chat"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [composerFocusNonce, setComposerFocusNonce] = useState(0);
  const [steps, setSteps] = useState<string[]>([]);
  const [myUsage, setMyUsage] = useState<TMyAiUsage | null>(null);
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
  /** 데이터 확대 — 패널 세션 동안만 유지 (localStorage 없음) */
  const [dataExpand, setDataExpand] = useState(false);

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

  const [docWriteMode, setDocWriteMode] = useState<"create" | "refine">(
    "create"
  );
  const [docType, setDocType] = useState("general");

  const [formResponseWriteMode, setFormResponseWriteMode] = useState<
    "create" | "refine"
  >("create");
  const [formResponseFillEmptyOnly, setFormResponseFillEmptyOnly] =
    useState(false);
  const [formResponseTargetFieldIds, setFormResponseTargetFieldIds] = useState<
    string[]
  >([]);

  const [activityWriteMode, setActivityWriteMode] = useState<
    "create" | "refine"
  >("create");
  const [activityFormType, setActivityFormType] = useState("general");

  const [formWriteMode, setFormWriteMode] = useState<"create" | "refine">(
    "create"
  );

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("새 대화");
  const [conversations, setConversations] = useState<TAlterConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySkillFilter, setHistorySkillFilter] = useState<
    "all" | TAlterSkillId
  >("all");
  const [historySelectMode, setHistorySelectMode] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [historyDeleting, setHistoryDeleting] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameCancelledRef = useRef(false);
  const [prepCollapsed, setPrepCollapsed] = useState(() =>
    shouldDefaultCollapsePrep(suggested[0] || "chat")
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

  const {
    skillSettingsLoading,
    expandedGuidelineId,
    setExpandedGuidelineId,
    syllabusGuidelineItems,
    syllabusSelectedGuidelineIds,
    setSyllabusSelectedGuidelineIds,
    evalGuidelineItems,
    evalSelectedGuidelineIds,
    setEvalSelectedGuidelineIds,
    archiveGuidelineItems,
    archiveSelectedGuidelineIds,
    setArchiveSelectedGuidelineIds,
    docGuidelineItems,
    docSelectedGuidelineIds,
    setDocSelectedGuidelineIds,
    docReviewGuidelineItems,
    docReviewSelectedGuidelineIds,
    setDocReviewSelectedGuidelineIds,
    docReviewLearningItems,
    docReviewSelectedLearningIds,
    setDocReviewSelectedLearningIds,
    formResponseGuidelineItems,
    formResponseSelectedGuidelineIds,
    setFormResponseSelectedGuidelineIds,
    activityGuidelineItems,
    activitySelectedGuidelineIds,
    setActivitySelectedGuidelineIds,
    formGuidelineItems,
    formSelectedGuidelineIds,
    setFormSelectedGuidelineIds,
  } = useAlterGuidelineLibrary({
    isOpen,
    seasonId: currentSeason?._id,
    selectedSkill,
  });

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

  const schoolIdForAlter =
    currentSchool?._id ||
    currentSchool?.school ||
    (currentSeason as { school?: string } | undefined)?.school ||
    "";

  const revokeMessagePreviews = useCallback(() => {
    messagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    messagePreviewUrlsRef.current = [];
  }, []);

  const resetPrepDefaultsForPage = useCallback(() => {
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
    setEvalSelectedGuidelineIds([]);
    setSyllabusSelectedGuidelineIds([]);
    const hasContent = !!(pageContext?.getDocument?.()?.content || "").trim();
    setDocWriteMode(hasContent ? "refine" : "create");
    setDocType("general");
    setDocSelectedGuidelineIds([]);
    setDocReviewSelectedGuidelineIds([]);
    setDocReviewSelectedLearningIds([]);
    const formSnap = pageContext?.getFormResponse?.();
    const hasFormTemplateOrBody = (formSnap?.fields || []).some((f) => {
      const tpl = String(f.template || "").trim();
      const cur =
        typeof f.currentValue === "string"
          ? f.currentValue.trim()
          : f.currentValue != null
            ? JSON.stringify(f.currentValue).trim()
            : "";
      if (String(f.type) === "docResponse") {
        return tpl.length >= 40 || cur.length >= 40;
      }
      return cur.length >= 1;
    });
    setFormResponseWriteMode(hasFormTemplateOrBody ? "refine" : "create");
    setFormResponseFillEmptyOnly(false);
    setFormResponseTargetFieldIds([]);
    setFormResponseSelectedGuidelineIds([]);
    setActivityWriteMode("create");
    setActivityFormType("general");
    setActivitySelectedGuidelineIds([]);
    const formSnapAdmin = pageContext?.getForm?.();
    const hasFormBlocks = (formSnapAdmin?.blocks || []).some((b) => {
      if (b?.type === "table") {
        return Array.isArray((b.data as { table?: unknown[] })?.table)
          ? ((b.data as { table?: unknown[] }).table || []).length > 0
          : false;
      }
      if (b?.type === "paragraph") {
        return !!String((b.data as { text?: string })?.text || "").trim();
      }
      return b?.type && b.type !== "paragraph";
    });
    setFormWriteMode(
      pageContext?.pageType === "form-editor" && hasFormBlocks
        ? "refine"
        : "create"
    );
    setFormSelectedGuidelineIds([]);
    setGradeFillEmptyOnly(false);
  }, [
    allEvalLabels,
    defaultArchiveContextLabels,
    defaultArchiveTargetLabels,
    defaultTargetLabels,
    pageContext,
  ]);

  const startNewConversation = useCallback(
    (preferSkill?: TAlterSkillId) => {
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
      resetPrepDefaultsForPage();
      // onClick에 그대로 넘기면 이벤트가 들어오므로 스킬 id만 허용
      const next =
        preferSkill && preferSkill in SKILL_LABEL
          ? preferSkill
          : suggested[0] || "chat";
      setSelectedSkill(next);
      const prep = isDraftPrepSkill(next);
      setShowPrep(prep);
      if (prep) setPrepCollapsed(shouldDefaultCollapsePrep(next));
    },
    [isWorking, resetPrepDefaultsForPage, revokeMessagePreviews, suggested]
  );

  const lastSkillPageTypeRef = useRef<string | undefined>(undefined);

  // Prep 기본값 갱신. 추천 스킬은 pageType이 바뀔 때만 (label만 바뀌면 칩 유지).
  useEffect(() => {
    const pageType = pageContext?.pageType;
    const pageTypeChanged = lastSkillPageTypeRef.current !== pageType;
    lastSkillPageTypeRef.current = pageType;

    if (pageTypeChanged && !isWorking && messages.length === 0) {
      const next = suggested[0] || "chat";
      setSelectedSkill(next);
      setShowPrep(isDraftPrepSkill(next));
    }
    resetPrepDefaultsForPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pageType/label 전환만 (대화 중 prep 유지)
  }, [pageContext?.pageType, pageContext?.label]);

  // pageType이 바뀌면 이전 대화 맥락과 분리 (작업 중이 아닐 때)
  const prevPageTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const pageType = pageContext?.pageType || "general";
    const prev = prevPageTypeRef.current;
    prevPageTypeRef.current = pageType;
    if (prev === undefined || prev === pageType) return;
    if (isWorking) return;
    if (!conversationId && messages.length === 0) return;
    startNewConversation();
  }, [
    pageContext?.pageType,
    isWorking,
    conversationId,
    messages.length,
    startNewConversation,
  ]);

  useEffect(() => {
    setAlterWorking(isWorking);
  }, [isWorking, setAlterWorking]);

  useEffect(() => {
    if (!isOpen || !isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isFullscreen, toggleFullscreen]);

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

  const refreshMyUsage = useCallback(() => {
    AIAPI.RMyAiUsage()
      .then((usage) => setMyUsage(usage))
      .catch(() => {
        /* 사용량 조회 실패는 Alter 사용을 막지 않음 */
      });
    // AIAPI 객체는 렌더마다 새로 만들어지므로 deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshMyUsage();
  }, [isOpen, refreshMyUsage]);

  const usageMeter = myUsage ? getUsageMeter(myUsage) : null;
  const usageLimitExceeded = !!usageMeter?.exceeded;

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
        guidelineItemIds: evalSelectedGuidelineIds,
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
    if (skill === "document-review") {
      const reviewDoc =
        pageContext?.getReviewDocument?.() ||
        (() => {
          const doc = pageContext?.getDocument?.();
          return doc
            ? {
                title: doc.title || "",
                content: doc.content || "",
                fieldNames: [] as string[],
              }
            : { title: "", content: "", fieldNames: [] as string[] };
        })();
      return {
        pageType: pageContext?.pageType || "docs",
        label: pageContext?.label || "",
        boardId: pageContext?.boardId || "",
        boardName: pageContext?.boardName || "",
        guidelineItemIds: docReviewSelectedGuidelineIds,
        learningItemIds: docReviewSelectedLearningIds,
        documentTitle: reviewDoc.title || "",
        documentText: reviewDoc.content || "",
        fieldNames: reviewDoc.fieldNames || [],
        sourceText: attachmentText,
        attachments,
      };
    }
    if (skill === "form-response-draft") {
      const current = pageContext?.getFormResponse?.() || {
        formId: "",
        formTitle: "",
        fields: [],
        responses: {},
        userCandidates: [],
      };
      const writable = (current.fields || []).filter((f) =>
        FORM_RESPONSE_WRITABLE_TYPES.has(String(f.type))
      );
      const targets =
        formResponseTargetFieldIds.length > 0
          ? formResponseTargetFieldIds
          : writable.map((f) => f.fieldId);
      return {
        pageType: "form-response",
        label: pageContext?.label || "",
        boardId: pageContext?.boardId || "",
        boardName: pageContext?.boardName || current.boardName || "",
        formId: current.formId,
        formTitle: current.formTitle,
        writeMode: formResponseWriteMode,
        fillEmptyOnly: formResponseFillEmptyOnly,
        targetFieldIds: targets,
        guidelineItemIds: formResponseSelectedGuidelineIds,
        fields: (current.fields || []).map((f) => ({
          fieldId: f.fieldId,
          label: f.label,
          type: f.type,
          options: f.options,
          template: f.template,
          validation: f.validation,
          content: f.template,
        })),
        currentResponses: current.responses || {},
        userCandidates: current.userCandidates || [],
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
        access: undefined,
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
        currentAccess: current.access || undefined,
        sourceText: attachmentText,
        attachments,
      };
    }
    if (skill === "form-draft") {
      const current = pageContext?.getForm?.() || {
        formId: "",
        title: "",
        formType: "timetable",
        blocks: [],
      };
      return {
        pageType: "form-editor",
        label: pageContext?.label || "",
        writeMode: formWriteMode,
        formType: current.formType || "timetable",
        formId: current.formId || "",
        guidelineItemIds: formSelectedGuidelineIds,
        currentTitle: current.title || "",
        currentBlocks: current.blocks || [],
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
    if (skill === "syllabus-draft") {
      return {
        pageType: pageContext?.pageType || "syllabus-edit",
        label: pageContext?.label || "",
        subject: pageContext?.subject || [],
        classTitle: pageContext?.classTitle || "",
        currentInfo: pageContext?.getCurrentInfo?.() || {},
        formSyllabus: pageContext?.formSyllabus || currentSeason?.formSyllabus,
        guidelineItemIds: syllabusSelectedGuidelineIds,
        sourceText: attachmentText,
        attachments,
      };
    }
    const chatSnapshot =
      pageContext?.getChatSnapshot?.({ dataExpand }) || null;
    return {
      pageType: pageContext?.pageType || "general",
      label: pageContext?.label || "",
      subject: pageContext?.subject || [],
      classTitle: pageContext?.classTitle || "",
      currentInfo: pageContext?.getCurrentInfo?.() || {},
      formSyllabus: pageContext?.formSyllabus || currentSeason?.formSyllabus,
      chatSnapshot,
      dataExpand,
      suggestedSkills: pageContext?.suggestedSkills?.length
        ? pageContext.suggestedSkills
        : ["chat"],
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

  const selectSkill = (skill: TAlterSkillId) => {
    if (isWorking || isRefining) return;
    // 한 대화에서 여러 Skill 허용 — 칩만 전환
    setSelectedSkill(skill);
    setExpandedGuidelineId(null);
    const prep = isDraftPrepSkill(skill);
    setShowPrep(prep);
    if (prep) setPrepCollapsed(shouldDefaultCollapsePrep(skill));
  };

  const openHistoryList = () => {
    setShowHistory(true);
    setHistorySkillFilter("all");
    exitHistorySelectMode();
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
        links?: TAlterGuideLink[];
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
            links: m.links,
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
      if (prep) setPrepCollapsed(shouldDefaultCollapsePrep(restored));
    } catch (err: any) {
      setError(err.message || "대화를 불러오지 못했습니다.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const clearHistorySelection = useCallback(() => {
    setSelectedHistoryIds(new Set());
  }, []);

  const exitHistorySelectMode = useCallback(() => {
    setHistorySelectMode(false);
    setSelectedHistoryIds(new Set());
  }, []);

  const deleteConversation = async (id: string) => {
    if (isWorking && conversationId === id) return;
    try {
      const res = await fetch(`${alterApiBase()}/alter/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "대화를 삭제하지 못했습니다.");
      }
      setConversations((prev) => prev.filter((c) => c._id !== id));
      setSelectedHistoryIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (renamingId === id) {
        setRenamingId(null);
        setRenameDraft("");
      }
      if (conversationId === id) startNewConversation();
    } catch (err: any) {
      setError(err.message || "대화를 삭제하지 못했습니다.");
    }
  };

  const bulkDeleteConversations = async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return;
    const blocked = unique.filter((id) => isWorking && conversationId === id);
    const targets = unique.filter((id) => !(isWorking && conversationId === id));
    if (targets.length === 0) {
      setError("진행 중인 대화는 삭제할 수 없습니다.");
      return;
    }
    const confirmed = window.confirm(
      targets.length === 1
        ? "이 대화를 삭제할까요?"
        : `선택한 ${targets.length}개 대화를 삭제할까요?`
    );
    if (!confirmed) return;

    setHistoryDeleting(true);
    setError("");
    try {
      const res = await fetch(
        `${alterApiBase()}/alter/conversations/bulk-delete`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: targets }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "대화를 삭제하지 못했습니다.");
      }
      const deleted: string[] = Array.isArray(data.deleted) ? data.deleted : [];
      const skippedWorking = (
        Array.isArray(data.skipped) ? data.skipped : []
      ).filter((s: { reason?: string }) => s.reason === "working").length;
      setConversations((prev) =>
        prev.filter((c) => !deleted.includes(c._id))
      );
      clearHistorySelection();
      if (conversationId && deleted.includes(conversationId)) {
        startNewConversation();
      }
      if (renamingId && deleted.includes(renamingId)) {
        setRenamingId(null);
        setRenameDraft("");
      }
      if (blocked.length > 0 || skippedWorking > 0) {
        setError("일부 대화는 진행 중이라 삭제하지 않았습니다.");
      } else if (deleted.length === 0) {
        setError("삭제할 수 있는 대화가 없습니다.");
      }
    } catch (err: any) {
      setError(err.message || "대화를 삭제하지 못했습니다.");
    } finally {
      setHistoryDeleting(false);
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
    review?: TAlterDocumentReviewResult | null;
    message?: string;
    skill?: string;
    conversationId?: string | null;
    links?: TAlterGuideLink[];
  }> => {
    if (!response.ok || !response.body) {
      throw new Error("AI 요청에 실패했습니다.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: {
      draft?: TAlterDraftResult | null;
      review?: TAlterDocumentReviewResult | null;
      message?: string;
      skill?: string;
      conversationId?: string | null;
      links?: TAlterGuideLink[];
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
                review: data.review || null,
                message: data.message || data.text || "",
                skill: data.skill,
                conversationId: data.conversationId || null,
                links: data.links || [],
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

    if (skill === "document-review") {
      const pageType = pageContext?.pageType;
      if (pageType !== "docs" && pageType !== "document") {
        setError("문서함 또는 보드 문서 화면에서 점검을 실행할 수 있습니다.");
        return;
      }
      const reviewDoc =
        pageContext?.getReviewDocument?.() ||
        pageContext?.getDocument?.() ||
        { title: "", content: "" };
      if (
        !(reviewDoc.content || "").trim() &&
        sourceAttachments.length === 0
      ) {
        setError(
          pageType === "docs"
            ? "점검할 문서가 없습니다. 학생과 양식을 선택한 뒤 다시 시도해 주세요."
            : "점검할 문서 본문이 없습니다. 에디터에 내용을 쓰거나 파일을 첨부해 주세요."
        );
        return;
      }
    }

    if (skill === "form-response-draft") {
      if (pageContext?.pageType !== "form-response") {
        setError("양식 응답 화면에서만 응답 초안을 사용할 수 있습니다.");
        return;
      }
      const current = pageContext?.getFormResponse?.();
      const writable = (current?.fields || []).filter((f) =>
        FORM_RESPONSE_WRITABLE_TYPES.has(String(f.type))
      );
      if (writable.length === 0) {
        setError("작성 가능한 응답 필드가 없습니다.");
        return;
      }
      const hasAttach = sourceAttachments.some((a) => !a.uploading);
      if (
        formResponseWriteMode === "create" &&
        !userText.trim() &&
        !hasAttach
      ) {
        setError("초안에 쓸 정보를 입력하거나 파일을 첨부해 주세요.");
        return;
      }
      const hasCurrent = writable.some((f) => {
        const v = current?.responses?.[f.fieldId];
        if (v == null) return false;
        if (typeof v === "string") return !!v.trim();
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === "object") return Object.keys(v as object).length > 0;
        return true;
      });
      const hasTpl = writable.some(
        (f) =>
          String(f.type) === "docResponse" &&
          !!String(f.template || "").trim()
      );
      if (
        formResponseWriteMode === "refine" &&
        !hasCurrent &&
        !hasTpl &&
        !userText.trim()
      ) {
        setError(
          "다듬을 응답이 없습니다. 필드에 내용을 쓰거나 요청을 입력해 주세요."
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
        access: undefined,
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

    if (skill === "form-draft") {
      if (pageContext?.pageType !== "form-editor") {
        setError("관리자 양식 화면에서 초안을 작성할 수 있습니다.");
        return;
      }
      if (!pageContext?.applyFormDraft) {
        setError("양식 문서를 연 뒤 초안을 작성할 수 있습니다.");
        return;
      }
      const current = pageContext?.getForm?.() || {
        title: "",
        blocks: [],
      };
      if (
        formWriteMode === "create" &&
        !userText.trim() &&
        sourceAttachments.length === 0
      ) {
        setError("초안에 쓸 정보를 입력하거나 파일을 첨부해 주세요.");
        return;
      }
      if (
        formWriteMode === "refine" &&
        !(current.blocks || []).length &&
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
    setSelectedSkill(skill);
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

    const history = buildHistoryForSkill([...messages, userMsg], skill);

    setMessages((prev) => [...prev, userMsg]);
    if (!conversationId || conversationTitle === "새 대화") {
      setConversationTitle(titleFallback.replace(/\s+/g, " ").trim().slice(0, 40));
    }

    const abort = new AbortController();
    abortRef.current = abort;
    let timedOut = false;
    cancelledByUserRef.current = false;
    // 서버가 진행 이벤트를 계속 보내는 동안은 끊지 않는다 (무응답 시간 기준)
    // 응답 스킬+이미지/첨부는 비전·긴 기안문 생성이라 여유를 둔다
    const inactivityTimeoutMs =
      skill === "form-response-draft" && sourceAttachments.length > 0
        ? 150_000
        : isDraftPrepSkill(skill)
          ? 90_000
          : 60_000;
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
            review: result.review || null,
            links: result.links,
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
            review: data.review || null,
            links: data.links,
            createdAt: new Date().toISOString(),
          },
        ]);
        if (!isOpenRef.current) setHasBackgroundResult(true);
      }
      if (isDraftPrepSkill(skill)) {
        setSelectedSkill("chat");
        setShowPrep(false);
      }
      refreshMyUsage();
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
      if (err.message === "AI_USAGE_LIMIT_EXCEEDED") {
        refreshMyUsage();
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
    if (isWorking || isRefining || attachUploading || usageLimitExceeded) return;
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
      (showPrep &&
        selectedSkill !== "document-review" &&
        pageContext?.pageType === "document")
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
      selectedSkill === "document-review" ||
      (showPrep && pageContext?.pageType === "docs")
    ) {
      const text = draft.trim();
      void runSkill(
        "document-review",
        text || "선택한 지침에 맞게 문서를 점검해 주세요."
      );
      setDraft("");
      return;
    }
    if (
      selectedSkill === "form-response-draft" ||
      (showPrep && pageContext?.pageType === "form-response")
    ) {
      const text = combinedSourceText();
      void runSkill(
        "form-response-draft",
        text ||
          (formResponseWriteMode === "refine"
            ? "양식 구조를 유지한 채 내용을 채워 주세요."
            : "양식 응답 초안을 작성해 주세요.")
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
      selectedSkill === "form-draft" ||
      (showPrep && pageContext?.pageType === "form-editor")
    ) {
      const text = combinedSourceText();
      void runSkill(
        "form-draft",
        text ||
          (formWriteMode === "refine"
            ? "요청한 부분만 수정해 주세요."
            : "양식 문서 초안을 작성해 주세요.")
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
      isRefining ||
      attachUploading
    )
      return;
    setDraft("");
    void runSkill(
      resolveSendSkill({
        selectedSkill,
        pageType: pageContext?.pageType,
        text,
        hasSourceAttachments: sourceAttachments.length > 0,
      }),
      text
    );
  };

  const refineWriteMode = (() => {
    if (selectedSkill === "document-draft") return docWriteMode;
    if (selectedSkill === "form-response-draft") return formResponseWriteMode;
    if (selectedSkill === "activity-draft") return activityWriteMode;
    if (selectedSkill === "form-draft") return formWriteMode;
    if (selectedSkill === "archive-draft") return archiveWriteMode;
    return "";
  })();

  const refineDraftPrompt = async () => {
    if (
      !canActivateRefinePrompt({
        usageLimitExceeded,
        isWorking,
        isRefining,
        attachUploading,
      })
    ) {
      return;
    }
    if (!currentSeason?._id) {
      setError("학기 정보가 없어 Alter를 사용할 수 없습니다.");
      return;
    }
    setError("");
    setIsRefining(true);
    try {
      const res = await fetch(`${alterApiBase()}/alter/refine-prompt`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: currentSeason._id,
          skill: selectedSkill,
          message: draft.trim(),
          context: {
            pageType: pageContext?.pageType || "general",
            label: pageContext?.label || "",
            classTitle: pageContext?.classTitle || "",
            writeMode: refineWriteMode,
            currentTitle:
              pageContext?.getDocument?.()?.title ||
              pageContext?.getReviewDocument?.()?.title ||
              pageContext?.getFormResponse?.()?.formTitle ||
              pageContext?.getActivity?.()?.title ||
              pageContext?.getForm?.()?.title ||
              "",
            currentExcerpt: buildRefineContentExcerpt({
              skill: selectedSkill,
              document: pageContext?.getDocument?.() || null,
              reviewDocument: pageContext?.getReviewDocument?.() || null,
              formResponse: (() => {
                const snap = pageContext?.getFormResponse?.();
                if (!snap) return null;
                const writable = (snap.fields || []).filter((f) =>
                  FORM_RESPONSE_WRITABLE_TYPES.has(String(f.type))
                );
                return {
                  formTitle: snap.formTitle,
                  fields: snap.fields,
                  responses: snap.responses,
                  targetFieldIds:
                    formResponseTargetFieldIds.length > 0
                      ? formResponseTargetFieldIds
                      : writable.map((f) => f.fieldId),
                };
              })(),
              activity: pageContext?.getActivity?.() || null,
              form: pageContext?.getForm?.() || null,
              syllabusInfo: pageContext?.getCurrentInfo?.() || null,
              evaluationTargets:
                evalTargetLabels.length > 0
                  ? evalTargetLabels
                  : defaultTargetLabels,
              archiveTargets:
                archiveTargetLabels.length > 0
                  ? archiveTargetLabels
                  : defaultArchiveTargetLabels,
              grade: (() => {
                const grade = pageContext?.getAssessmentGradeContext?.();
                if (!grade) return null;
                return {
                  formTitle: grade.formTitle,
                  fields: grade.fields,
                  responses: grade.responses,
                };
              })(),
              chatSummary: pageContext?.getChatSnapshot?.()?.summary || "",
            }),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          MESSAGE.get(data.message) ||
            data.message ||
            "요청문을 다듬지 못했습니다."
        );
      }
      const prompt = String(data.prompt || "").trim();
      if (!prompt) {
        throw new Error("요청문이 비어 있습니다. 다시 시도해 주세요.");
      }
      setDraft(prompt);
      setComposerFocusNonce((n) => n + 1);
      refreshMyUsage();
    } catch (err: any) {
      setError(err.message || "요청문을 다듬지 못했습니다.");
    } finally {
      setIsRefining(false);
    }
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
        if (file.size > 10 * 1024 * 1024) {
          setError(`"${file.name}" 파일이 너무 큽니다. (최대 10MB)`);
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

    if (isFormResponseDraft(draftResult)) {
      if (!pageContext?.applyFormResponseDraft) return;
      const result = pageContext.applyFormResponseDraft({
        byField: draftResult.byField || {},
        fillEmptyOnly:
          draftResult.fillEmptyOnly ?? formResponseFillEmptyOnly,
      });
      setAppliedDraftIds((prev) => new Set(prev).add(msgId));
      if (!result.applied) {
        setError(
          result.skipped
            ? "변경된 내용이 없습니다. 이미 같은 값이거나 초안이 비어 있습니다."
            : "반영할 응답 초안이 없었습니다."
        );
      } else {
        setError("");
        setMessages((prev) => [
          ...prev,
          {
            id: `a-applied-${Date.now()}`,
            role: "assistant",
            content: `응답 초안 ${result.applied}개 필드를 반영했습니다${
              result.skipped ? ` (${result.skipped}개 변경 없음/건너뜀)` : ""
            }. 확인 후 제출해 주세요.`,
            skill: "form-response-draft",
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
        access: draftResult.access as any,
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

    if (isFormDraft(draftResult)) {
      if (!pageContext?.applyFormDraft) {
        setError("양식 문서를 연 뒤 초안을 반영할 수 있습니다.");
        return;
      }
      const result = pageContext.applyFormDraft({
        title: draftResult.title,
        writeMode: draftResult.writeMode,
        formType: draftResult.formType,
        blocks: draftResult.blocks,
        ops: draftResult.ops,
      });
      setAppliedDraftIds((prev) => new Set(prev).add(msgId));
      if (!result.applied) {
        setError("반영할 양식 초안이 없었습니다.");
      } else {
        setError("");
        setMessages((prev) => [
          ...prev,
          {
            id: `a-applied-${Date.now()}`,
            role: "assistant",
            content:
              draftResult.writeMode === "refine"
                ? "요청한 부분만 에디터에 반영했습니다. 확인한 뒤 저장해 주세요."
                : "양식 초안을 에디터에 반영했습니다. 확인·수정한 뒤 저장해 주세요.",
            skill: "form-draft",
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

  let pageDataHint: {
    included: number;
    total: number;
    isPartial: boolean;
  } | null = null;
  if (pageContext?.getChatSnapshot) {
    try {
      const snap = pageContext.getChatSnapshot({ dataExpand });
      if (snap) {
        const included = Array.isArray(snap.items) ? snap.items.length : 0;
        const total =
          typeof snap.totalCount === "number" ? snap.totalCount : included;
        if (total > 0 || included > 0) {
          pageDataHint = {
            included,
            total: Math.max(total, included),
            isPartial: !!snap.isPartial || included < total,
          };
        }
      }
    } catch {
      // 스냅샷 생성 실패 시 패널 UI는 유지하고 힌트만 숨긴다
      pageDataHint = null;
    }
  }

  const pageDataHintText = (() => {
    if (!pageDataHint) return "";
    const { included, total, isPartial } = pageDataHint;
    // 목록형: 포함된 행/전체 행. 문서형(1건·필드만 잘림): 건수만.
    if (isPartial && included < total) {
      return `페이지 데이터 ${included}/${total}건 참고`;
    }
    if (isPartial) {
      return `페이지 데이터 ${total}건 참고 (일부 내용)`;
    }
    return `페이지 데이터 ${total}건 참고`;
  })();

  const showDataExpandBadge =
    !!pageContext?.getChatSnapshot &&
    !!pageDataHint &&
    pageDataHint.total > DATA_EXPAND_BADGE_MIN_TOTAL;

  // 50건 이하로 줄면 확대 모드·뱃지 모두 정리
  useEffect(() => {
    if (dataExpand && !showDataExpandBadge) {
      setDataExpand(false);
    }
  }, [dataExpand, showDataExpandBadge]);

  const pageDataEmptySubtitle = (() => {
    if (!pageDataHint) {
      return "Alter에게 질문하세요. 추천 Skill을 고르면 초안·점검 모드로 전환됩니다. 대화는 자동 저장됩니다.";
    }
    const { included, total, isPartial } = pageDataHint;
    if (isPartial && included < total) {
      return dataExpand
        ? `지금 연 페이지 데이터 중 ${included}/${total}건만 참고합니다. 더 정확한 답이 필요하면 목록을 필터로 줄여 주세요.`
        : showDataExpandBadge
          ? `지금 연 페이지 데이터 중 ${included}/${total}건만 참고합니다. 목록을 필터로 줄이거나 「데이터 확대」를 켤 수 있습니다.`
          : `지금 연 페이지 데이터 중 ${included}/${total}건만 참고합니다. 목록을 필터로 줄여 주세요.`;
    }
    if (isPartial) {
      return `지금 연 페이지 데이터를 기준으로 답합니다. 긴 내용은 일부만 포함될 수 있습니다.`;
    }
    return `지금 연 페이지에 불러온 데이터(${total}건)를 기준으로 답합니다. 아래 Skill로 작성·점검 모드로 전환할 수 있습니다.`;
  })();

  const contextLabel =
    pageContext?.label ||
    (pageContext?.pageType === "syllabus-edit"
      ? "강의계획서 작성"
      : pageContext?.pageType === "syllabus"
        ? "강의계획서"
        : pageContext?.pageType === "evaluation"
          ? "평가"
          : pageContext?.pageType === "archive"
            ? "기록"
            : pageContext?.pageType === "docs"
              ? "문서함"
              : pageContext?.pageType === "document"
                ? "문서"
                : pageContext?.pageType === "form-response"
                  ? "응답"
                  : pageContext?.pageType === "activity"
                    ? "활동"
                    : pageContext?.pageType === "form-editor"
                      ? "양식"
                      : pageContext?.pageType === "assessment-grade"
                      ? "채점"
                      : pageContext?.pageType === "course-list"
                        ? "수업 목록"
                        : pageContext?.pageType === "calendar"
                          ? "캘린더"
                          : pageContext?.pageType === "sheet"
                            ? "응답 기록"
                            : pageContext?.pageType === "guide"
                              ? "Altsis 안내"
                              : "일반");

  const inSyllabusPrep = showPrep && selectedSkill === "syllabus-draft";
  const inEvalPrep = showPrep && selectedSkill === "evaluation-draft";
  const inArchivePrep = showPrep && selectedSkill === "archive-draft";
  const inDocPrep = showPrep && selectedSkill === "document-draft";
  const inDocReviewPrep = showPrep && selectedSkill === "document-review";
  const inFormResponsePrep =
    showPrep && selectedSkill === "form-response-draft";
  const inActivityPrep = showPrep && selectedSkill === "activity-draft";
  const inFormPrep = showPrep && selectedSkill === "form-draft";
  const inGradePrep = showPrep && selectedSkill === "assessment-grade";
  const inPrep =
    inSyllabusPrep ||
    inEvalPrep ||
    inArchivePrep ||
    inDocPrep ||
    inDocReviewPrep ||
    inFormResponsePrep ||
    inActivityPrep ||
    inFormPrep ||
    inGradePrep;

  const prepKind = prepKindFromSkill(showPrep, selectedSkill);

  const formResponseWritableFields = (() => {
    if (!inFormResponsePrep) return [];
    const snap = pageContext?.getFormResponse?.();
    return (snap?.fields || []).filter((f) =>
      FORM_RESPONSE_WRITABLE_TYPES.has(String(f.type))
    );
  })();

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
      onClick={toggleFullscreen}
      aria-pressed={isFullscreen}
      aria-label={fullscreenToggleLabel(isFullscreen)}
      title={fullscreenToggleLabel(isFullscreen)}
    >
      {isFullscreen ? (
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

  const prepPrimaryLabel = prepPrimaryLabelFor(prepKind, messages);

  const prepSummaryParts = buildPrepSummaryParts({
    prepKind,
    evalTargetCount:
      evalTargetLabels.length > 0
        ? evalTargetLabels.length
        : defaultTargetLabels.length,
    evalStudentCount: evalSelectedIds.length,
    evalFillEmptyOnly,
    archiveTargetCount:
      archiveTargetLabels.length > 0
        ? archiveTargetLabels.length
        : defaultArchiveTargetLabels.length,
    archiveStudentCount: archiveSelectedIds.length,
    archiveFillEmptyOnly,
    archiveWriteMode,
    docWriteMode,
    docTypeLabel: docTypeLabel(docType),
    formResponseFieldCount:
      formResponseTargetFieldIds.length > 0
        ? formResponseTargetFieldIds.length
        : formResponseWritableFields.length,
    formResponseFillEmptyOnly,
    activityFormTypeLabel: activityFormTypeLabel(activityFormType),
    activityWriteMode,
    formWriteMode,
    formTypeLabel: adminFormTypeLabel(
      pageContext?.getForm?.()?.formType || ""
    ),
    gradeFillEmptyOnly,
    gradeLabel: pageContext?.label,
    guidelineCount:
      prepKind === "syllabus"
        ? syllabusSelectedGuidelineIds.length
        : prepKind === "document-review"
          ? docReviewSelectedGuidelineIds.length
          : prepKind === "evaluation"
            ? evalSelectedGuidelineIds.length
            : undefined,
  });

  const modeLabel = alterModeLabel(inPrep);

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
        <div className={chatUiStyle.composerMenu} role="menu">
          <button
            type="button"
            className={`${chatUiStyle.composerMenuItem} ${style.attachMenuItem}`}
            role="menuitem"
            disabled={attachDisabled}
            onClick={() => imageInputRef.current?.click()}
          >
            <Svg type="image" width="18px" height="18px" />
            사진
          </button>
          <button
            type="button"
            className={`${chatUiStyle.composerMenuItem} ${style.attachMenuItem}`}
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

  const historySkillCounts = useMemo(() => {
    const counts = new Map<TAlterSkillId, number>();
    for (const c of conversations) {
      const skill = normalizeSkillId(c.lastSkill);
      counts.set(skill, (counts.get(skill) || 0) + 1);
    }
    return counts;
  }, [conversations]);

  const historySkillChips = useMemo(() => {
    const order = Object.keys(SKILL_LABEL) as TAlterSkillId[];
    return order
      .filter((id) => (historySkillCounts.get(id) || 0) > 0)
      .map((id) => ({
        id,
        label: SKILL_LABEL[id],
        count: historySkillCounts.get(id) || 0,
      }));
  }, [historySkillCounts]);

  const filteredConversations = useMemo(() => {
    if (historySkillFilter === "all") return conversations;
    return conversations.filter(
      (c) => normalizeSkillId(c.lastSkill) === historySkillFilter
    );
  }, [conversations, historySkillFilter]);

  const selectableFilteredIds = useMemo(
    () =>
      filteredConversations
        .filter((c) => !(isWorking && conversationId === c._id))
        .map((c) => c._id),
    [filteredConversations, isWorking, conversationId]
  );

  const allFilteredSelected =
    selectableFilteredIds.length > 0 &&
    selectableFilteredIds.every((id) => selectedHistoryIds.has(id));

  const toggleHistorySelect = (id: string) => {
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedHistoryIds((prev) => {
        const next = new Set(prev);
        selectableFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      selectableFilteredIds.forEach((id) => next.add(id));
      return next;
    });
  };

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
        actions={
          <>
            {conversations.length > 0 ? (
              <button
                type="button"
                className={style.actionBtn}
                onClick={() => {
                  if (historySelectMode) exitHistorySelectMode();
                  else {
                    setHistorySelectMode(true);
                    clearHistorySelection();
                    setRenamingId(null);
                  }
                }}
                disabled={historyDeleting}
                aria-pressed={historySelectMode}
              >
                {historySelectMode ? "선택 취소" : "선택"}
              </button>
            ) : null}
            {expandToggleBtn}
          </>
        }
        onClose={onClose}
        closeTitle="창만 닫기 (진행 중 작업은 계속됩니다)"
      />
      <div className={chatUiStyle.listShell}>
        {conversations.length > 0 && historySkillChips.length > 0 ? (
          <div
            className={style.historyFilterRow}
            role="tablist"
            aria-label="스킬별 대화 필터"
          >
            <button
              type="button"
              role="tab"
              aria-selected={historySkillFilter === "all"}
              className={`${style.historyFilterChip} ${
                style.historyFilterToneAll
              } ${historySkillFilter === "all" ? style.active : ""}`}
              onClick={() => {
                setHistorySkillFilter("all");
                clearHistorySelection();
              }}
            >
              전체 {conversations.length}
            </button>
            {historySkillChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={historySkillFilter === chip.id}
                className={`${style.historyFilterChip} ${
                  skillToneClass(chip.id)
                } ${historySkillFilter === chip.id ? style.active : ""}`}
                onClick={() => {
                  setHistorySkillFilter(chip.id);
                  clearHistorySelection();
                }}
                title={SKILL_CHIP_HINT[chip.id]}
              >
                {chip.label} {chip.count}
              </button>
            ))}
          </div>
        ) : null}
        {historySelectMode && filteredConversations.length > 0 ? (
          <div className={style.historySelectBar}>
            <label className={style.historySelectAll}>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                disabled={
                  selectableFilteredIds.length === 0 || historyDeleting
                }
                onChange={toggleSelectAllFiltered}
              />
              <span>
                {allFilteredSelected
                  ? "선택 해제"
                  : `표시 중 ${selectableFilteredIds.length}개 전체 선택`}
              </span>
            </label>
            <span className={style.historySelectCount}>
              {selectedHistoryIds.size}개 선택
            </span>
          </div>
        ) : null}
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
          ) : filteredConversations.length === 0 ? (
            <ChatEmptyState
              icon={
                <span
                  className={style.iconStar}
                  style={{ width: 40, height: 40 }}
                  aria-hidden
                />
              }
              title="이 스킬의 대화가 없습니다"
              subtitle="다른 뱃지를 고르거나 전체를 확인해 보세요."
            />
          ) : (
            filteredConversations.map((c) => {
              const skillName = skillLabel(c.lastSkill);
              const isRenaming = renamingId === c._id;
              const rowWorking = isWorking && conversationId === c._id;
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
                  selectable={historySelectMode}
                  selected={selectedHistoryIds.has(c._id)}
                  selectDisabled={rowWorking || historyDeleting}
                  onToggleSelect={() => toggleHistorySelect(c._id)}
                  leading={
                    skillName ? (
                      <span
                        className={`${style.skillTag} ${skillToneClass(
                          c.lastSkill
                        )}`}
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
                    !historySelectMode && isRenaming
                      ? {
                          value: renameDraft,
                          onChange: setRenameDraft,
                          onSubmit: () => void submitRenameConversation(),
                          onCancel: cancelRenameConversation,
                        }
                      : undefined
                  }
                  menuItems={
                    historySelectMode
                      ? undefined
                      : [
                          {
                            key: "rename",
                            label: "이름 변경",
                            icon: (
                              <Svg type="edit" width="16px" height="16px" />
                            ),
                            onClick: () => beginRenameConversation(c),
                          },
                          {
                            key: "delete",
                            label: "삭제",
                            danger: true,
                            icon: (
                              <Svg type="trash" width="16px" height="16px" />
                            ),
                            onClick: () => void deleteConversation(c._id),
                          },
                        ]
                  }
                />
              );
            })
          )}
        </div>
        <div className={chatUiStyle.listFooter}>
          {historySelectMode ? (
            <>
              <Button
                type="ghost"
                onClick={() =>
                  void bulkDeleteConversations(
                    Array.from(selectedHistoryIds)
                  )
                }
                disabled={
                  historyDeleting || selectedHistoryIds.size === 0
                }
                style={{ width: "100%" }}
              >
                {historyDeleting
                  ? "삭제 중…"
                  : `선택 ${selectedHistoryIds.size}개 삭제`}
              </Button>
              {historySkillFilter !== "all" &&
              filteredConversations.length > 0 ? (
                <Button
                  type="ghost"
                  onClick={() =>
                    void bulkDeleteConversations(
                      filteredConversations.map((c) => c._id)
                    )
                  }
                  disabled={historyDeleting}
                  style={{ width: "100%" }}
                >
                  이 뱃지 전체 삭제
                </Button>
              ) : null}
            </>
          ) : (
            <Button
              type="ghost"
              onClick={startNewConversation}
              disabled={isWorking}
              style={{ width: "100%" }}
            >
              새 대화
            </Button>
          )}
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
        <span className={style.modeBadge} title={modeLabel}>
          {modeLabel}
        </span>
        <span>
          현재 화면: {contextLabel}
          {currentRegistration?.role
            ? ` · ${currentRegistration.role === "teacher" ? "교사" : "학생"}`
            : ""}
          {pageDataHintText ? ` · ${pageDataHintText}` : ""}
        </span>
        {showDataExpandBadge ? (
          <button
            type="button"
            className={`${style.dataExpandBadge}${
              dataExpand ? ` ${style.dataExpandBadgeActive}` : ""
            }`}
            aria-pressed={dataExpand}
            title={
              dataExpand
                ? "데이터 확대 적용 중(최대 150건). 목록이 더 많으면 필터로 줄인 뒤 질문하세요."
                : "더 많은 페이지 데이터를 참고합니다(최대 150건). Alt 사용량이 늘어날 수 있습니다."
            }
            onClick={() => setDataExpand((v) => !v)}
          >
            데이터 확대
          </button>
        ) : null}
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
            title="질문해 보세요"
            subtitle={pageDataEmptySubtitle}
          />
        )}
        {messages.length === 0 && inPrep && (
          <ChatEmptyState
            icon={
              <Svg
                type="send"
                width="40px"
                height="40px"
                style={{ fill: "var(--accent-4, #ccc)" }}
              />
            }
            title={`${SKILL_LABEL[selectedSkill]} 준비`}
            subtitle={
              prepCollapsed
                ? "설정이 접혀 있습니다. 요약이 맞으면 「초안 작성」을 누르거나, 「설정 펼치기」로 옵션을 조정하세요."
                : "아래 설정을 확인한 뒤 「초안 작성」또는 「문서 점검」으로 시작하세요. 결과는 미리보기로 확인 후 반영합니다."
            }
          />
        )}

        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            variant={msg.role === "user" ? "own" : "other"}
            wide={!!msg.draft || !!msg.review}
            time={formatBubbleTime(msg.createdAt)}
            sender={
              <>
                {msg.role === "user" ? "나" : "Alter"}
                {msg.skill ? (
                  <span
                    className={`${style.skillTag} ${skillToneClass(msg.skill)}`}
                  >
                    {skillLabel(msg.skill)}
                  </span>
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
                  escapeRawHtml
                />
              ) : (
                <div className={style.msgText}>{msg.content}</div>
              )
            ) : null}
            <SkillDraftResult
              msgId={msg.id}
              draft={msg.draft}
              review={msg.review}
              applied={appliedDraftIds.has(msg.id)}
              pageContext={pageContext}
              onApply={applyDraft}
            />
            {msg.role === "assistant" ? (
              <AlterGuideLinks links={msg.links} />
            ) : null}
          </ChatMessageBubble>
        ))}

        {isWorking && steps.length > 0 && (
          <ChatMessageBubble variant="other" sender="Alter">
            <ol className={style.steps} aria-live="polite">
              {steps.map((s, i) => {
                const done = i < steps.length - 1;
                return (
                  <li
                    key={`${s}-${i}`}
                    className={`${style.stepItem} ${
                      done ? style.stepDone : style.stepActive
                    }`}
                  >
                    <span className={style.stepMark} aria-hidden>
                      {done ? "✓" : "…"}
                    </span>
                    <span>{s}</span>
                  </li>
                );
              })}
            </ol>
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
                className={`${style.skillChip} ${skillToneClass(skill)} ${
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
                title={SKILL_CHIP_HINT[skill]}
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
        {inPrep && prepCollapsed && prepSummaryParts.length > 0 && (
          <div className={style.prepSummaryRow} aria-live="polite">
            {prepSummaryParts.map((part) => (
              <span key={part} className={style.prepSummaryChip}>
                {part}
              </span>
            ))}
          </div>
        )}
        {inPrep && !prepCollapsed && (
          <div className={style.prepScroll}>
            <SkillPrepDock
              prepKind={prepKind}
              skillSettingsLoading={skillSettingsLoading}
              pageContext={pageContext}
              expandedGuidelineId={expandedGuidelineId}
              setExpandedGuidelineId={setExpandedGuidelineId}
              toggleLabel={toggleLabel}
              teacherEditableFields={teacherEditableFields}
              allEvalLabels={allEvalLabels}
              evalTargetLabels={evalTargetLabels}
              setEvalTargetLabels={setEvalTargetLabels}
              evalContextLabels={evalContextLabels}
              setEvalContextLabels={setEvalContextLabels}
              evalScope={evalScope}
              setEvalScope={setEvalScope}
              evalFillEmptyOnly={evalFillEmptyOnly}
              setEvalFillEmptyOnly={setEvalFillEmptyOnly}
              evalCandidateStudents={evalCandidateStudents}
              evalSelectedIds={evalSelectedIds}
              toggleStudentId={toggleStudentId}
              selectDefaultStudentBatch={selectDefaultStudentBatch}
              selectAllCandidateStudents={selectAllCandidateStudents}
              clearEvalStudents={() => setEvalSelectedStudentIds([])}
              evalGuidelineItems={evalGuidelineItems}
              evalSelectedGuidelineIds={evalSelectedGuidelineIds}
              setEvalSelectedGuidelineIds={setEvalSelectedGuidelineIds}
              archiveInputFields={archiveInputFields}
              archiveReferenceFields={archiveReferenceFields}
              archiveWriteMode={archiveWriteMode}
              setArchiveWriteMode={setArchiveWriteMode}
              archiveTargetLabels={archiveTargetLabels}
              setArchiveTargetLabels={setArchiveTargetLabels}
              archiveContextLabels={archiveContextLabels}
              setArchiveContextLabels={setArchiveContextLabels}
              archiveScope={archiveScope}
              setArchiveScope={setArchiveScope}
              archiveFillEmptyOnly={archiveFillEmptyOnly}
              setArchiveFillEmptyOnly={setArchiveFillEmptyOnly}
              archiveGuidelineItems={archiveGuidelineItems}
              archiveSelectedGuidelineIds={archiveSelectedGuidelineIds}
              setArchiveSelectedGuidelineIds={setArchiveSelectedGuidelineIds}
              archiveCandidateStudents={archiveCandidateStudents}
              archiveSelectedIds={archiveSelectedIds}
              toggleArchiveStudentId={toggleArchiveStudentId}
              selectDefaultArchiveStudentBatch={selectDefaultArchiveStudentBatch}
              selectAllArchiveCandidateStudents={selectAllArchiveCandidateStudents}
              clearArchiveStudents={() => setArchiveSelectedStudentIds([])}
              syllabusGuidelineItems={syllabusGuidelineItems}
              syllabusSelectedGuidelineIds={syllabusSelectedGuidelineIds}
              setSyllabusSelectedGuidelineIds={setSyllabusSelectedGuidelineIds}
              docWriteMode={docWriteMode}
              setDocWriteMode={setDocWriteMode}
              docType={docType}
              setDocType={setDocType}
              docGuidelineItems={docGuidelineItems}
              docSelectedGuidelineIds={docSelectedGuidelineIds}
              setDocSelectedGuidelineIds={setDocSelectedGuidelineIds}
              docReviewGuidelineItems={docReviewGuidelineItems}
              docReviewSelectedGuidelineIds={docReviewSelectedGuidelineIds}
              setDocReviewSelectedGuidelineIds={setDocReviewSelectedGuidelineIds}
              docReviewLearningItems={docReviewLearningItems}
              docReviewSelectedLearningIds={docReviewSelectedLearningIds}
              setDocReviewSelectedLearningIds={setDocReviewSelectedLearningIds}
              formResponseWritableFields={formResponseWritableFields}
              formResponseWriteMode={formResponseWriteMode}
              setFormResponseWriteMode={setFormResponseWriteMode}
              formResponseFillEmptyOnly={formResponseFillEmptyOnly}
              setFormResponseFillEmptyOnly={setFormResponseFillEmptyOnly}
              formResponseTargetFieldIds={formResponseTargetFieldIds}
              setFormResponseTargetFieldIds={setFormResponseTargetFieldIds}
              formResponseGuidelineItems={formResponseGuidelineItems}
              formResponseSelectedGuidelineIds={formResponseSelectedGuidelineIds}
              setFormResponseSelectedGuidelineIds={setFormResponseSelectedGuidelineIds}
              activityWriteMode={activityWriteMode}
              setActivityWriteMode={setActivityWriteMode}
              activityFormType={activityFormType}
              setActivityFormType={setActivityFormType}
              activityGuidelineItems={activityGuidelineItems}
              activitySelectedGuidelineIds={activitySelectedGuidelineIds}
              setActivitySelectedGuidelineIds={setActivitySelectedGuidelineIds}
              formWriteMode={formWriteMode}
              setFormWriteMode={setFormWriteMode}
              formTypeLabel={adminFormTypeLabel(
                pageContext?.getForm?.()?.formType || ""
              )}
              formGuidelineItems={formGuidelineItems}
              formSelectedGuidelineIds={formSelectedGuidelineIds}
              setFormSelectedGuidelineIds={setFormSelectedGuidelineIds}
              gradeFillEmptyOnly={gradeFillEmptyOnly}
              setGradeFillEmptyOnly={setGradeFillEmptyOnly}
            />
          </div>
        )}
      </div>

      <div className={style.composerWrap}>
        <AiUsageBar usage={myUsage} />
        {attachmentChips}
        <ChatInputBar
          bare
          value={draft}
          onChange={setDraft}
          onSend={() => {
            if (usageLimitExceeded || isRefining) return;
            if (inPrep) startSuggested();
            else sendDraft();
          }}
          onRefine={() => {
            void refineDraftPrompt();
          }}
          refineDisabled={
            !canActivateRefinePrompt({
              usageLimitExceeded,
              isWorking,
              isRefining,
              attachUploading,
            })
          }
          refineActive={canActivateRefinePrompt({
            usageLimitExceeded,
            isWorking,
            isRefining,
            attachUploading,
          })}
          refineTitle={isRefining ? "요청문을 다듬는 중" : "요청 다듬기"}
          disabled={
            isWorking || isRefining || attachUploading || usageLimitExceeded
          }
          sendDisabled={
            usageLimitExceeded ||
            isRefining ||
            (inSyllabusPrep ||
            (inDocPrep && docWriteMode === "create") ||
            (inFormResponsePrep && formResponseWriteMode === "create") ||
            (inActivityPrep && activityWriteMode === "create") ||
            (inFormPrep && formWriteMode === "create")
              ? isWorking ||
                attachUploading ||
                (!draft.trim() && sourceAttachments.length === 0)
              : inPrep
                ? isWorking || attachUploading
                : isWorking ||
                  attachUploading ||
                  (!draft.trim() && sourceAttachments.length === 0))
          }
          sendActive={
            !usageLimitExceeded &&
            !isRefining &&
            (inSyllabusPrep ||
            (inDocPrep && docWriteMode === "create") ||
            (inFormResponsePrep && formResponseWriteMode === "create") ||
            (inActivityPrep && activityWriteMode === "create") ||
            (inFormPrep && formWriteMode === "create")
              ? !isWorking &&
                !attachUploading &&
                (!!draft.trim() || sourceAttachments.length > 0)
              : inPrep
                ? !isWorking && !attachUploading
                : (!!draft.trim() || sourceAttachments.length > 0) &&
                  !isWorking &&
                  !attachUploading)
          }
          sendTitle={inPrep ? prepPrimaryLabel : "보내기"}
          leftSlot={attachButton}
          focusNonce={composerFocusNonce}
          showTextarea={
            !inPrep ||
            inEvalPrep ||
            inSyllabusPrep ||
            inArchivePrep ||
            inDocPrep ||
            inDocReviewPrep ||
            inFormResponsePrep ||
            inActivityPrep ||
            inFormPrep ||
            inGradePrep
          }
          centerHint={undefined}
          placeholder={
            inDocReviewPrep
              ? "예: 총평·구체성 위주, 낙인 표현이 있는지 봐 주세요 (비워도 점검 가능)"
              : inGradePrep
                ? "예: 감상문의 구체성을 중심으로, 피드백은 2문장"
                : inActivityPrep
                  ? activityWriteMode === "refine"
                    ? "예: 객관식 3문항 추가, 서술형 필드 하나 더"
                    : "예: 수학 복습 퀴즈 5문항, 객관식+단답, 필수 응답"
                  : inFormPrep
                    ? formWriteMode === "refine"
                      ? "예: 목요일 저녁만 자율로 바꿔 주세요"
                      : "예: 월~금 0~10교시, 점심 12:10, 선택 칸은 체크박스"
                    : inFormResponsePrep
                    ? formResponseWriteMode === "refine"
                      ? "예: 문장을 공손하게, 빈 칸 위주로 채워 주세요"
                      : "예: 목적·일정·필요 내용을 적어 주세요"
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
                    if (
                      !usageLimitExceeded &&
                      !isWorking &&
                      !isRefining &&
                      !attachUploading
                    ) {
                      startSuggested();
                    }
                  }
                }
              : undefined
          }
        />
      </div>
    </>
  );

  const panelBody = showHistory ? historyListView : conversationView;

  if (isOpen && isFullscreen && typeof document !== "undefined") {
    return createPortal(
      <div className={style.fullscreenRoot}>
        <button
          type="button"
          className={style.fullscreenBackdrop}
          aria-label="원래 크기로"
          onClick={toggleFullscreen}
        />
        <div
          className={style.fullscreenPanel}
          role="dialog"
          aria-modal="true"
          aria-label="Alter 전체 화면"
        >
          {panelBody}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <ChatPanelShell
      variant="expanded"
      showOverlay={isOpen}
      onOverlayClick={onClose}
    >
      {panelBody}
    </ChatPanelShell>
  );
};

export default AlterPanel;
