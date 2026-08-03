import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "contexts/authContext";
import { TAlterSkillId, useAlter } from "contexts/alterContext";
import { MESSAGE } from "hooks/_message";
import {
  extractSyllabusInputFields,
  isSyllabusFieldFilled,
  readSyllabusInfoValue,
} from "utils/syllabusAiFields";
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

type TAlterDraftResult = {
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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  skill?: string;
  review?: TAlterReviewResult | null;
  draft?: TAlterDraftResult | null;
  createdAt?: string;
};

type TAlterReviewResult = {
  summary: string;
  overallLevel: "good" | "fair" | "needs_work";
  items: Array<{
    field: string;
    level: "good" | "fair" | "needs_work" | "empty";
    comment: string;
    suggestion: string;
  }>;
};

const LEVEL_LABEL: Record<string, string> = {
  good: "충분",
  fair: "보통",
  needs_work: "보완 필요",
  empty: "미작성",
};

const SKILL_LABEL: Record<TAlterSkillId, string> = {
  chat: "일반 대화",
  "syllabus-review": "강의계획서 점검",
  "evaluation-draft": "평가 초안",
};

const formatBubbleTime = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const skillLabel = (skill?: string) => {
  if (!skill) return "";
  if (skill in SKILL_LABEL) return SKILL_LABEL[skill as TAlterSkillId];
  return skill;
};

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

type Props = {
  onClose: () => void;
};

const wantsReviewText = (text: string) =>
  /^(점검|리뷰|피드백|다시\s*점검)/.test(text) ||
  /계획서.*(점검|리뷰)/.test(text) ||
  /\/(점검|review)/i.test(text);

const wantsEvalDraftText = (text: string) =>
  /평가.*(초안|작성)/.test(text) ||
  /(초안|작성).*평가/.test(text) ||
  /\/(평가|evaluation[-_]?draft)/i.test(text);

const AlterPanel = ({ onClose }: Props) => {
  const { currentSeason, currentRegistration } = useAuth();
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
  const [selectedRefIndexes, setSelectedRefIndexes] = useState<number[]>([]);
  const [skillGuidelines, setSkillGuidelines] = useState("");
  const [skillReferences, setSkillReferences] = useState<
    Array<{ title?: string; content?: string }>
  >([]);
  const [skillSettingsLoading, setSkillSettingsLoading] = useState(false);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const [appliedDraftIds, setAppliedDraftIds] = useState<Set<string>>(
    new Set()
  );
  const [showPrep, setShowPrep] = useState(() => {
    const first = suggested[0] || "chat";
    return first === "syllabus-review" || first === "evaluation-draft";
  });

  const [evalTargetLabels, setEvalTargetLabels] = useState<string[]>([]);
  const [evalContextLabels, setEvalContextLabels] = useState<string[]>([]);
  // 기본: 자기평가·기존 멘토평가를 종합해 멘토평가를 덮어쓰는 흐름
  const [evalFillEmptyOnly, setEvalFillEmptyOnly] = useState(false);
  const [evalScope, setEvalScope] = useState<"empty" | "all">("all");
  const [evalSelectedStudentIds, setEvalSelectedStudentIds] = useState<
    string[]
  >([]);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState("새 대화");
  const [conversations, setConversations] = useState<TAlterConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const cancelledByUserRef = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const skipSmoothScrollRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    if (!actionMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      ) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [actionMenuOpen]);

  const references = skillReferences;
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

  const inputFields = useMemo(
    () => extractSyllabusInputFields(pageContext?.formSyllabus),
    [pageContext?.formSyllabus]
  );

  // 화면이 바뀌어도 진행 중/저장된 대화는 유지하고 Prep 기본값만 갱신
  useEffect(() => {
    const next = suggested[0] || "chat";
    setSelectedSkill(next);
    if (!isWorking && messages.length === 0) {
      setShowPrep(next === "syllabus-review" || next === "evaluation-draft");
    }
    setEvalTargetLabels(defaultTargetLabels);
    setEvalContextLabels(allEvalLabels);
    setEvalFillEmptyOnly(false);
    setEvalScope("all");
    setEvalSelectedStudentIds([]);
  }, [pageContext?.pageType, pageContext?.label]);

  useEffect(() => {
    setAlterWorking(isWorking);
  }, [isWorking, setAlterWorking]);

  // 새로고침 후에도 최근 대화를 복원
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (!currentSeason?._id || didRestoreRef.current || isWorking) return;
    didRestoreRef.current = true;
    void (async () => {
      try {
        const res = await fetch(
          `${alterApiBase()}/alter/conversations?season=${currentSeason._id}&limit=1`,
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
  }, [currentSeason?._id]);

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
    if (!isOpen || !currentSeason?._id) return;
    if (
      selectedSkill !== "syllabus-review" &&
      selectedSkill !== "evaluation-draft"
    ) {
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
        setSkillReferences(
          Array.isArray(data.references) ? data.references : []
        );
      } catch {
        if (cancelled) return;
        setSkillGuidelines("");
        setSkillReferences([]);
      } finally {
        if (!cancelled) setSkillSettingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentSeason?._id, selectedSkill]);

  useEffect(() => {
    if (references.length === 0) {
      setSelectedRefIndexes([]);
      return;
    }
    setSelectedRefIndexes(references.slice(0, 2).map((_, i) => i));
  }, [references]);

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

  const evalCandidateKey = evalCandidateStudents
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

  const evalSelectedIds = useMemo(() => {
    const allowed = new Set(evalCandidateStudents.map((s) => s.studentId));
    return evalSelectedStudentIds
      .filter((id) => allowed.has(id))
      .slice(0, EVAL_DRAFT_MAX);
  }, [evalSelectedStudentIds, evalCandidateStudents]);

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
    return {
      pageType: pageContext?.pageType || "general",
      label: pageContext?.label || "",
      subject: pageContext?.subject || [],
      classTitle: pageContext?.classTitle || "",
      currentInfo: pageContext?.getCurrentInfo?.() || {},
      formSyllabus: pageContext?.formSyllabus || currentSeason?.formSyllabus,
      referenceIndexes: selectedRefIndexes,
    };
  };

  const loadConversations = async () => {
    if (!currentSeason?._id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `${alterApiBase()}/alter/conversations?season=${currentSeason._id}`,
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

  const startNewConversation = () => {
    if (isWorking) {
      setError("작업이 끝난 뒤 새 대화를 시작할 수 있습니다.");
      return;
    }
    setConversationId(null);
    setConversationTitle("새 대화");
    setMessages([]);
    setError("");
    setSteps([]);
    setAppliedFields(new Set());
    setAppliedDraftIds(new Set());
    setShowHistory(false);
    const next = suggested[0] || "chat";
    setSelectedSkill(next);
    setShowPrep(next === "syllabus-review" || next === "evaluation-draft");
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
      }>;
      setConversationId(id);
      const meta =
        preset || conversations.find((c) => c._id === id);
      setConversationTitle(meta?.title || "대화");
      skipSmoothScrollRef.current = true;
      setMessages(
        rows.map((m) => ({
          id: m._id,
          role: m.role,
          content: m.content || "",
          skill: m.skill,
          review: m.review || null,
          draft: m.draft || null,
          createdAt: m.createdAt,
        }))
      );
      setShowHistory(false);
      setShowPrep(false);
      setSelectedSkill("chat");
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
      if (conversationId === id) startNewConversation();
    } catch (err: any) {
      setError(err.message || "대화를 삭제하지 못했습니다.");
    }
  };

  const parseSse = async (
    response: Response,
    onStep: (m: string) => void,
    onActivity?: () => void
  ): Promise<{
    review?: TAlterReviewResult | null;
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
      review?: TAlterReviewResult | null;
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
                review: data.review || null,
                draft: data.draft || null,
                message: data.message || "",
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

  const missingRequired = () => {
    const info = pageContext?.getCurrentInfo?.() || {};
    return inputFields
      .filter((f) => f.required)
      .filter((f) => !isSyllabusFieldFilled(info, f))
      .map((f) => f.name);
  };

  const runSkill = async (skill: TAlterSkillId, userText: string) => {
    if (!currentSeason?._id) {
      setError("학기 정보가 없어 Alter를 사용할 수 없습니다.");
      return;
    }

    if (skill === "syllabus-review") {
      const missing = missingRequired();
      if (missing.length > 0) {
        setError(
          `필수 항목을 작성한 뒤 점검해 주세요. (미작성: ${missing.join(", ")})`
        );
        return;
      }
      if (pageContext?.pageType !== "syllabus-edit") {
        setError("강의계획서 작성/수정 화면에서 점검할 수 있습니다.");
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

    setIsWorking(true);
    setError("");
    setSteps([]);
    setShowPrep(false);
    setShowHistory(false);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: userText,
      skill,
      createdAt: new Date().toISOString(),
    };
    const history = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    if (!conversationId || conversationTitle === "새 대화") {
      setConversationTitle(
        userText.replace(/\s+/g, " ").trim().slice(0, 40) || "대화"
      );
    }

    const abort = new AbortController();
    abortRef.current = abort;
    let timedOut = false;
    cancelledByUserRef.current = false;
    // 서버가 진행 이벤트를 계속 보내는 동안은 끊지 않는다 (무응답 시간 기준)
    const inactivityTimeoutMs =
      skill === "evaluation-draft" || skill === "syllabus-review"
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
          message: userText,
          history: history.slice(0, -1),
          context: buildContext(skill),
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
            content:
              result.message ||
              result.review?.summary ||
              "응답을 생성했습니다.",
            skill: result.skill || skill,
            review: result.review,
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
            content: data.message || "",
            skill: data.skill || skill,
            review: data.review,
            draft: data.draft,
            createdAt: new Date().toISOString(),
          },
        ]);
        if (!isOpenRef.current) setHasBackgroundResult(true);
      }
      if (skill === "syllabus-review" || skill === "evaluation-draft") {
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
    if (selectedSkill === "evaluation-draft" || (showPrep && pageContext?.pageType === "evaluation")) {
      void runSkill(
        "evaluation-draft",
        draft.trim() || "평가 초안을 작성해 주세요."
      );
      return;
    }
    if (selectedSkill === "syllabus-review" || showPrep) {
      void runSkill("syllabus-review", "강의계획서 전체를 점검해 주세요.");
      return;
    }
    setShowPrep(false);
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (!text || isWorking) return;
    setDraft("");
    let skill: TAlterSkillId = "chat";
    if (
      wantsEvalDraftText(text) &&
      pageContext?.pageType === "evaluation"
    ) {
      skill = "evaluation-draft";
    } else if (
      wantsReviewText(text) &&
      pageContext?.pageType === "syllabus-edit"
    ) {
      skill = "syllabus-review";
    }
    void runSkill(skill, text);
  };

  const applySuggestion = (field: string, suggestion: string) => {
    if (!suggestion?.trim() || !pageContext?.applyFieldSuggestion) return;
    pageContext.applyFieldSuggestion(field, suggestion);
    setAppliedFields((prev) => new Set(prev).add(field));
  };

  const applyDraft = (msgId: string, draftResult: TAlterDraftResult) => {
    if (!pageContext?.applyEvaluationCsv || !draftResult.csv) return;
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

  const levelClass = (level: string) => {
    if (level === "good") return style.levelGood;
    if (level === "fair") return style.levelFair;
    if (level === "empty") return style.levelEmpty;
    return style.levelNeeds;
  };

  const contextLabel =
    pageContext?.label ||
    (pageContext?.pageType === "syllabus-edit"
      ? "강의계획서 작성"
      : pageContext?.pageType === "evaluation"
        ? "평가"
        : "일반");

  const inSyllabusPrep = showPrep && selectedSkill === "syllabus-review";
  const inEvalPrep = showPrep && selectedSkill === "evaluation-draft";
  const inPrep = inSyllabusPrep || inEvalPrep;


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

  const prepPrimaryLabel = inEvalPrep
    ? messages.some((m) => m.draft)
      ? "다시 작성"
      : "초안 작성"
    : messages.some((m) => m.review)
      ? "다시 점검"
      : "점검 시작";

  const plusMenu = (
    <div className={chatUiStyle.actionMenuWrap} ref={actionMenuRef}>
      <button
        type="button"
        className={chatUiStyle.slotBtn}
        onClick={() => setActionMenuOpen((v) => !v)}
        aria-label="더보기"
        title="더보기"
        aria-expanded={actionMenuOpen}
      >
        <Svg type="plus" width="20px" height="20px" />
      </button>
      {actionMenuOpen && (
        <div className={chatUiStyle.actionMenu} role="menu">
          <button
            type="button"
            className={chatUiStyle.actionMenuItem}
            role="menuitem"
            disabled={isWorking}
            onClick={() => {
              setActionMenuOpen(false);
              startNewConversation();
            }}
          >
            새 대화
          </button>
          {inPrep && messages.length > 0 && (
            <button
              type="button"
              className={chatUiStyle.actionMenuItem}
              role="menuitem"
              disabled={isWorking}
              onClick={() => {
                setActionMenuOpen(false);
                setSelectedSkill("chat");
                setShowPrep(false);
              }}
            >
              대화로
            </button>
          )}
          {!inPrep && pageContext?.pageType === "syllabus-edit" && (
            <button
              type="button"
              className={chatUiStyle.actionMenuItem}
              role="menuitem"
              disabled={isWorking}
              onClick={() => {
                setActionMenuOpen(false);
                setSelectedSkill("syllabus-review");
                setShowPrep(true);
              }}
            >
              점검하기
            </button>
          )}
          {!inPrep && pageContext?.pageType === "evaluation" && (
            <button
              type="button"
              className={chatUiStyle.actionMenuItem}
              role="menuitem"
              disabled={isWorking}
              onClick={() => {
                setActionMenuOpen(false);
                setSelectedSkill("evaluation-draft");
                setShowPrep(true);
              }}
            >
              평가 초안
            </button>
          )}
        </div>
      )}
    </div>
  );

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
            conversations.map((c) => (
              <ChatListRow
                key={c._id}
                title={c.title || "대화"}
                count={c.messageCount}
                time={`${c.status === "working" ? "진행 중 · " : ""}${formatAlterListTime(c.lastMessageAt)}`}
                preview={c.lastMessagePreview}
                active={conversationId === c._id}
                leading={
                  <span
                    className={style.iconStar}
                    style={{ width: 28, height: 28 }}
                    aria-hidden
                  />
                }
                onClick={() => void openConversation(c._id, c)}
                menuItems={[
                  {
                    key: "delete",
                    label: "삭제",
                    danger: true,
                    icon: <Svg type="trash" width="16px" height="16px" />,
                    onClick: () => void deleteConversation(c._id),
                  },
                ]}
              />
            ))
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

      <div className={style.skillRow}>
        {suggested.map((skill) => (
          <button
            key={skill}
            type="button"
            className={`${style.skillChip} ${
              (
                skill === "syllabus-review" || skill === "evaluation-draft"
                  ? showPrep && selectedSkill === skill
                  : selectedSkill === skill && !showPrep
              )
                ? style.active
                : ""
            }`}
            onClick={() => {
              setSelectedSkill(skill);
              if (
                skill === "syllabus-review" ||
                skill === "evaluation-draft"
              ) {
                setShowPrep(true);
              } else {
                setShowPrep(false);
              }
            }}
            disabled={isWorking}
          >
            {SKILL_LABEL[skill]}
          </button>
        ))}
        {!suggested.includes("chat") && (
          <button
            type="button"
            className={`${style.skillChip} ${
              selectedSkill === "chat" && !inPrep ? style.active : ""
            }`}
            onClick={() => {
              setSelectedSkill("chat");
              setShowPrep(false);
            }}
            disabled={isWorking}
          >
            {SKILL_LABEL.chat}
          </button>
        )}
      </div>

      <div className={style.body}>
        {error && <div className={style.error}>{error}</div>}

        {inSyllabusPrep && (
          <>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>학교 작성 지침</p>
              <p className={style.prepText}>
                {skillSettingsLoading
                  ? "지침을 불러오는 중..."
                  : guidelines ||
                    "학교에 선택된 작성 지침이 없습니다. 기본 기준으로 점검합니다. (관리 → 학교 AI → 라이브러리)"}
              </p>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>참고 자료 (최대 2개)</p>
              {skillSettingsLoading ? (
                <p className={style.prepText}>참고 자료를 불러오는 중...</p>
              ) : references.length === 0 ? (
                <p className={style.prepText}>
                  등록된 참고 자료가 없습니다. (관리 → 학교 AI → 라이브러리)
                </p>
              ) : (
                <div className={style.refList}>
                  {references.map((ref, index) => (
                    <label
                      key={`${ref.title}-${index}`}
                      className={style.refRow}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRefIndexes.includes(index)}
                        onChange={() => {
                          setSelectedRefIndexes((prev) => {
                            if (prev.includes(index)) {
                              return prev.filter((i) => i !== index);
                            }
                            if (prev.length >= 2) {
                              return [...prev.slice(1), index];
                            }
                            return [...prev, index];
                          });
                        }}
                      />
                      <span>{ref.title || `참고자료 ${index + 1}`}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className={style.prepHintRow}>
              <PrepHint text="「점검 시작」을 누르면 현재 초안의 모든 항목을 평가합니다. 점검 후에는 이어서 대화할 수 있습니다." />
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
            wide={!!(msg.draft || msg.review)}
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
            {msg.content ? (
              msg.role === "assistant" ? (
                <MarkdownViewer
                  content={normalizeAlterMarkdown(msg.content)}
                  className={style.mdContent}
                />
              ) : (
                msg.content
              )
            ) : null}
            {msg.draft && (
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
                      const labels = msg.draft!.targetLabels?.length
                        ? msg.draft!.targetLabels
                        : Object.keys(row.values || {});
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
                    {msg.draft.csv && (
                      <button
                        type="button"
                        className={style.applyBtn}
                        onClick={() => {
                          const blob = new Blob(["\uFEFF" + msg.draft!.csv], {
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
            {msg.review && (
              <div className={style.reviewList}>
                {msg.review.items.map((item) => {
                  const meta = inputFields.find(
                    (f) => f.name === item.field || f.id === item.field
                  );
                  const draftVal = meta
                    ? readSyllabusInfoValue(
                        pageContext?.getCurrentInfo?.() || {},
                        meta
                      )
                    : undefined;
                  return (
                    <div key={item.field} className={style.reviewItem}>
                      <div className={style.reviewHeader}>
                        <span>{item.field}</span>
                        <span
                          className={`${style.levelChip} ${levelClass(
                            item.level
                          )}`}
                        >
                          {LEVEL_LABEL[item.level] || item.level}
                        </span>
                      </div>
                      {draftVal != null && String(draftVal).trim() !== "" && (
                        <p className={style.reviewComment}>
                          작성: {String(draftVal).slice(0, 120)}
                          {String(draftVal).length > 120 ? "…" : ""}
                        </p>
                      )}
                      {item.comment && (
                        <p className={style.reviewComment}>{item.comment}</p>
                      )}
                      {item.suggestion && (
                        <>
                          <p className={style.suggestion}>{item.suggestion}</p>
                          {pageContext?.applyFieldSuggestion && (
                            <button
                              type="button"
                              className={style.applyBtn}
                              disabled={appliedFields.has(item.field)}
                              onClick={() =>
                                applySuggestion(item.field, item.suggestion)
                              }
                            >
                              {appliedFields.has(item.field)
                                ? "반영됨"
                                : "이 제안 반영"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

      <ChatInputBar
        value={draft}
        onChange={setDraft}
        onSend={() => {
          setActionMenuOpen(false);
          if (inPrep) startSuggested();
          else sendDraft();
        }}
        disabled={isWorking}
        sendDisabled={inPrep ? isWorking : isWorking || !draft.trim()}
        sendActive={inPrep ? !isWorking : !!draft.trim() && !isWorking}
        sendTitle={inPrep ? prepPrimaryLabel : "보내기"}
        leftSlot={plusMenu}
        showTextarea={!inPrep || inEvalPrep}
        centerHint="옵션을 고른 뒤 시작하세요"
        placeholder={
          inEvalPrep
            ? "예: 멘토 의견은 2~3문장, 성장 포인트를 중심으로"
            : "메시지를 입력하세요"
        }
        onKeyDown={
          inPrep
            ? (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isWorking) {
                    setActionMenuOpen(false);
                    startSuggested();
                  }
                }
              }
            : undefined
        }
      />
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
