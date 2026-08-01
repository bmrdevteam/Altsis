import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "contexts/authContext";
import { TAlterSkillId, useAlter } from "contexts/alterContext";
import { MESSAGE } from "hooks/_message";
import {
  extractSyllabusInputFields,
  isSyllabusFieldFilled,
  readSyllabusInfoValue,
} from "utils/syllabusAiFields";
import Svg from "assets/svg/Svg";
import style from "./Alter.module.scss";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  skill?: string;
  review?: TAlterReviewResult | null;
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
};

type Props = {
  onClose: () => void;
};

const wantsReviewText = (text: string) =>
  /^(점검|리뷰|피드백|다시\s*점검)/.test(text) ||
  /계획서.*(점검|리뷰)/.test(text) ||
  /\/(점검|review)/i.test(text);

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
  /** 점검 Skill 안내 화면 (대화와 별개) */
  const [showPrep, setShowPrep] = useState(
    () => (suggested[0] || "chat") === "syllabus-review"
  );
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const references = currentSeason?.aiSettings?.references || [];
  const guidelines = (currentSeason?.aiSettings?.guidelines || "").trim();

  useEffect(() => {
    const next = suggested[0] || "chat";
    setSelectedSkill(next);
    setShowPrep(next === "syllabus-review");
    setMessages([]);
    setError("");
    setAppliedFields(new Set());
  }, [pageContext?.pageType, pageContext?.label]);

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

  const inputFields = useMemo(
    () => extractSyllabusInputFields(pageContext?.formSyllabus),
    [pageContext?.formSyllabus]
  );

  const buildContext = () => ({
    subject: pageContext?.subject || [],
    classTitle: pageContext?.classTitle || "",
    currentInfo: pageContext?.getCurrentInfo?.() || {},
    formSyllabus:
      pageContext?.formSyllabus || currentSeason?.formSyllabus,
    referenceIndexes: selectedRefIndexes,
  });

  const parseSse = async (
    response: Response,
    onStep: (m: string) => void
  ): Promise<{
    review?: TAlterReviewResult | null;
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
      message?: string;
      skill?: string;
    } = {};
    let errMsg = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
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
            context: buildContext(),
            autoDetectSkill: false,
          }),
        }
      );

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const result = await parseSse(response, (m) => {
          setSteps((prev) => [...prev, m]);
        });
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
          },
        ]);
      }
      // 특화 Skill 실행 후에는 후속 대화를 일반 chat으로
      if (skill === "syllabus-review") {
        setSelectedSkill("chat");
        setShowPrep(false);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(
        MESSAGE.get(err.message) || err.message || "AI 처리에 실패했습니다."
      );
    } finally {
      setIsWorking(false);
      abortRef.current = null;
    }
  };

  const startSuggested = () => {
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
    // 기본은 대화(chat). 명시적으로 점검을 요청할 때만 review Skill
    const skill: TAlterSkillId = wantsReviewText(text)
      ? "syllabus-review"
      : "chat";
    void runSkill(skill, text);
  };

  const applySuggestion = (field: string, suggestion: string) => {
    if (!suggestion?.trim() || !pageContext?.applyFieldSuggestion) return;
    pageContext.applyFieldSuggestion(field, suggestion);
    setAppliedFields((prev) => new Set(prev).add(field));
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
      : "일반");

  const inPrep = showPrep && selectedSkill === "syllabus-review";

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
              (skill === "syllabus-review" ? inPrep : selectedSkill === skill)
                ? style.active
                : ""
            }`}
            onClick={() => {
              setSelectedSkill(skill);
              if (skill === "syllabus-review") {
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

        {inPrep && (
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
          <div className={style.footerActions}>
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
              {messages.some((m) => m.review) ? "다시 점검" : "점검 시작"}
            </button>
          </div>
        ) : (
          <>
            <textarea
              className={style.textarea}
              value={draft}
              disabled={isWorking}
              placeholder="메시지를 입력하세요. (점검하려면「다시 점검」또는「계획서 점검해줘」)"
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
