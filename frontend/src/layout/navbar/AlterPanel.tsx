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
import Svg from "assets/svg/Svg";
import style from "./Alter.module.scss";

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

const EVAL_DRAFT_MAX = 30;

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
  const { pageContext, isExpanded, toggleExpanded } = useAlter();

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
  const [evalFillEmptyOnly, setEvalFillEmptyOnly] = useState(true);
  const [evalScope, setEvalScope] = useState<"empty" | "all">("empty");

  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const references = currentSeason?.aiSettings?.references || [];
  const guidelines = (currentSeason?.aiSettings?.guidelines || "").trim();

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

  useEffect(() => {
    const next = suggested[0] || "chat";
    setSelectedSkill(next);
    setShowPrep(next === "syllabus-review" || next === "evaluation-draft");
    setMessages([]);
    setError("");
    setAppliedFields(new Set());
    setAppliedDraftIds(new Set());
    setEvalTargetLabels(defaultTargetLabels);
    // 작성 대상 포함 전체 항목을 참고 후보로 (기존 작성 내용 활용)
    setEvalContextLabels(allEvalLabels);
    setEvalFillEmptyOnly(true);
    setEvalScope("empty");
  }, [pageContext?.pageType, pageContext?.label]);

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
    if (references.length === 0) {
      setSelectedRefIndexes([]);
      return;
    }
    setSelectedRefIndexes(references.slice(0, 2).map((_, i) => i));
  }, [references.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, steps.length, isWorking]);

  const evalStudentPreview = useMemo(() => {
    if (pageContext?.pageType !== "evaluation") {
      return { total: 0, selectedIds: [] as string[], capped: false };
    }
    const rows = pageContext.getEvaluationRows?.() || [];
    const targets =
      evalTargetLabels.length > 0 ? evalTargetLabels : defaultTargetLabels;
    let filtered = rows.filter((r) => r.studentId);
    if (evalScope === "empty" || evalFillEmptyOnly) {
      filtered = filtered.filter((r) =>
        targets.some((label) => isEmptyEval(r.evaluation?.[label]))
      );
    }
    const capped = filtered.length > EVAL_DRAFT_MAX;
    return {
      total: filtered.length,
      selectedIds: filtered.slice(0, EVAL_DRAFT_MAX).map((r) => r.studentId),
      capped,
    };
  }, [
    pageContext,
    evalTargetLabels,
    defaultTargetLabels,
    evalScope,
    evalFillEmptyOnly,
  ]);

  const buildContext = (skill: TAlterSkillId) => {
    if (skill === "evaluation-draft") {
      const targets =
        evalTargetLabels.length > 0 ? evalTargetLabels : defaultTargetLabels;
      return {
        syllabusId: pageContext?.syllabusId || "",
        classTitle: pageContext?.classTitle || "",
        formEvaluation: pageContext?.formEvaluation || [],
        targetLabels: targets,
        // 작성 대상 필드도 기존 내용이 있으면 참고로 보낼 수 있음
        contextLabels: evalContextLabels,
        fillEmptyOnly: evalFillEmptyOnly,
        studentIds: evalStudentPreview.selectedIds,
        csv: pageContext?.getEvaluationCsv?.() || "",
      };
    }
    return {
      subject: pageContext?.subject || [],
      classTitle: pageContext?.classTitle || "",
      currentInfo: pageContext?.getCurrentInfo?.() || {},
      formSyllabus: pageContext?.formSyllabus || currentSeason?.formSyllabus,
      referenceIndexes: selectedRefIndexes,
    };
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
            } else if (eventType === "done") {
              result = {
                review: data.review || null,
                draft: data.draft || null,
                message: data.message || "",
                skill: data.skill,
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
      if (evalStudentPreview.selectedIds.length === 0) {
        setError(
          evalFillEmptyOnly
            ? "채울 빈 칸이 있는 학생이 없습니다."
            : "초안을 작성할 학생이 없습니다."
        );
        return;
      }
    }

    setIsWorking(true);
    setError("");
    setSteps([]);
    setShowPrep(false);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: userText,
      skill,
    };
    const history = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);

    const abort = new AbortController();
    abortRef.current = abort;
    let timedOut = false;
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
      const response = await fetch(
        `${process.env.REACT_APP_SERVER_URL}/api/ai/alter`,
        {
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
          }),
        }
      );

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const result = await parseSse(
          response,
          (m) => {
            setSteps((prev) => [...prev, m]);
          },
          resetInactivityTimeout
        );
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
          },
        ]);
      } else {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            MESSAGE.get(data.message) ||
              data.message ||
              "AI 요청에 실패했습니다."
          );
        }
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.message || "",
            skill: data.skill || skill,
            review: data.review,
            draft: data.draft,
          },
        ]);
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
    }
  };

  const startSuggested = () => {
    if (selectedSkill === "evaluation-draft" || (showPrep && pageContext?.pageType === "evaluation")) {
      void runSkill(
        "evaluation-draft",
        draft.trim() || "선택한 평가 항목에 대해 초안을 작성해 주세요."
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

  return (
    <div
      className={`${style.panel} ${isExpanded ? style.panelExpanded : ""}`}
    >
      <div className={style.header}>
        <h3 className={style.title}>Alter</h3>
        <div className={style.headerActions}>
          <button
            type="button"
            className={style.closeBtn}
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
          <button
            type="button"
            className={style.closeBtn}
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            aria-label="닫기"
          >
            <Svg type="x" width="16px" height="16px" />
          </button>
        </div>
      </div>

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
              <p className={style.prepLabel}>저장된 작성 지침</p>
              <p className={style.prepText}>
                {guidelines ||
                  "학기에 저장된 작성 지침이 없습니다. 기본 기준으로 점검합니다."}
              </p>
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>참고 자료 (최대 2개)</p>
              {references.length === 0 ? (
                <p className={style.prepText}>등록된 참고 자료가 없습니다.</p>
              ) : (
                <div className={style.refList}>
                  {references.map((ref, index) => (
                    <label key={`${ref.title}-${index}`} className={style.refRow}>
                      <input
                        type="checkbox"
                        checked={selectedRefIndexes.includes(index)}
                        onChange={() => {
                          setSelectedRefIndexes((prev) => {
                            if (prev.includes(index)) {
                              return prev.filter((i) => i !== index);
                            }
                            if (prev.length >= 2) return [...prev.slice(1), index];
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
            <p className={style.emptyHint}>
              「점검 시작」을 누르면 현재 초안의 모든 항목을 평가합니다. 점검
              후에는 이어서 대화할 수 있습니다.
            </p>
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
              <p className={style.prepLabel}>참고할 항목</p>
              {allEvalLabels.length === 0 ? (
                <p className={style.prepText}>참고할 항목이 없습니다.</p>
              ) : (
                <>
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
                  <p className={style.prepText}>
                    작성할 항목이라도 이미 입력된 내용은 참고로 쓸 수 있습니다.
                  </p>
                </>
              )}
            </div>
            <div className={style.prepCard}>
              <p className={style.prepLabel}>범위</p>
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
                  <span>전체 학생</span>
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
              <p className={style.prepText}>
                대상 {evalStudentPreview.selectedIds.length}명
                {evalStudentPreview.capped
                  ? ` (최대 ${EVAL_DRAFT_MAX}명/회, 전체 ${evalStudentPreview.total}명)`
                  : evalStudentPreview.total > 0
                    ? ``
                    : " · 대상 없음"}
              </p>
            </div>
            {guidelines && (
              <div className={style.prepCard}>
                <p className={style.prepLabel}>학기 작성 지침</p>
                <p className={style.prepText}>{guidelines}</p>
              </div>
            )}
            <p className={style.emptyHint}>
              요청 문구를 적거나 「초안 작성」을 누르면 CSV 기준으로 초안을
              만듭니다. 반영 후에도 행별 저장이 필요합니다.
            </p>
          </>
        )}

        {messages.length === 0 && !inPrep && (
          <p className={style.emptyHint}>
            Alter에게 질문하거나, 추천 Skill로 작업을 시작해 보세요.
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${style.bubble} ${
              msg.role === "user" ? style.bubbleUser : style.bubbleAssistant
            }`}
          >
            <div className={style.bubbleMeta}>
              {msg.role === "user" ? "나" : "Alter"}
              {msg.skill && (
                <span className={style.skillTag}>{msg.skill}</span>
              )}
            </div>
            <div>{msg.content}</div>
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
                      const labels =
                        msg.draft!.targetLabels?.length
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
          </div>
        ))}

        {isWorking && steps.length > 0 && (
          <div className={`${style.bubble} ${style.bubbleAssistant}`}>
            <div className={style.bubbleMeta}>Alter</div>
            <div className={style.steps}>
              {steps.map((s, i) => (
                <div key={`${s}-${i}`}>• {s}</div>
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className={style.footer}>
        {inPrep ? (
          <div className={style.footerActions} style={{ width: "100%", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            {inEvalPrep && (
              <textarea
                className={style.textarea}
                value={draft}
                disabled={isWorking}
                placeholder="예: 멘토 의견은 2~3문장, 성장 포인트를 중심으로"
                onChange={(e) => setDraft(e.target.value)}
              />
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {messages.length > 0 && (
                <button
                  type="button"
                  className={style.actionBtn}
                  disabled={isWorking}
                  onClick={() => {
                    setSelectedSkill("chat");
                    setShowPrep(false);
                  }}
                >
                  대화로
                </button>
              )}
              <button
                type="button"
                className={`${style.actionBtn} ${style.primary}`}
                disabled={isWorking}
                onClick={startSuggested}
              >
                {inEvalPrep
                  ? messages.some((m) => m.draft)
                    ? "다시 작성"
                    : "초안 작성"
                  : messages.some((m) => m.review)
                    ? "다시 점검"
                    : "점검 시작"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              className={style.textarea}
              value={draft}
              disabled={isWorking}
              placeholder={
                pageContext?.pageType === "evaluation"
                  ? "메시지를 입력하세요. (평가 초안은 Skill에서)"
                  : "메시지를 입력하세요. (점검하려면「다시 점검」또는「계획서 점검해줘」)"
              }
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendDraft();
                }
              }}
            />
            <div className={style.footerActions}>
              {pageContext?.pageType === "syllabus-edit" && (
                <button
                  type="button"
                  className={style.actionBtn}
                  disabled={isWorking}
                  onClick={() => {
                    setSelectedSkill("syllabus-review");
                    setShowPrep(true);
                  }}
                >
                  점검하기
                </button>
              )}
              {pageContext?.pageType === "evaluation" && (
                <button
                  type="button"
                  className={style.actionBtn}
                  disabled={isWorking}
                  onClick={() => {
                    setSelectedSkill("evaluation-draft");
                    setShowPrep(true);
                  }}
                >
                  평가 초안
                </button>
              )}
              <button
                type="button"
                className={`${style.actionBtn} ${style.primary}`}
                disabled={isWorking || !draft.trim()}
                onClick={sendDraft}
              >
                보내기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AlterPanel;
