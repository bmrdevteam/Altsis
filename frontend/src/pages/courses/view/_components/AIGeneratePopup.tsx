/**
 * @file Alter — 강의계획서 Skill 어시스턴트 (챗봇형)
 * @page 수업 작성/수정
 */
import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "contexts/authContext";

import Popup from "components/popup/Popup";
import Button from "components/button/Button";

import _ from "lodash";
import { ALERT_ERROR } from "hooks/useAPIv2";
import { MESSAGE } from "hooks/_message";
import {
  extractSyllabusInputFields,
  isSyllabusFieldFilled,
  readSyllabusInfoValue,
} from "utils/syllabusAiFields";
import AlterAIIcon from "./AlterAIIcon";
import AlterReviewBadge, {
  REVIEW_LEVEL_LABEL,
  TAlterReviewResult,
} from "./AlterReviewBadge";
import style from "./AIGeneratePopup.module.scss";

type StepInfo = {
  message: string;
  completed: boolean;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  skill?: string;
  review?: TAlterReviewResult | null;
};

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  courseSubject: string[];
  courseTitle: string;
  courseMoreInfo: React.MutableRefObject<any>;
  onInfoUpdate?: (info: any) => void;
  initialReview?: TAlterReviewResult | null;
  initialReviewedInfo?: Record<string, any>;
  openToResults?: boolean;
  onReviewComplete?: (payload: {
    review: TAlterReviewResult;
    reviewedInfo: Record<string, any>;
  }) => void;
};

const Index = (props: Props) => {
  const { currentSeason } = useAuth();

  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const [selectedRefIndexes, setSelectedRefIndexes] = useState<number[]>([]);
  const [review, setReview] = useState<TAlterReviewResult | null>(
    props.initialReview ?? null
  );
  const [reviewedInfo, setReviewedInfo] = useState<Record<string, any>>(
    props.initialReviewedInfo ?? {}
  );
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (props.initialReview) {
      return [
        {
          id: "initial-review",
          role: "assistant",
          content: props.initialReview.summary || "이전 점검 결과입니다.",
          skill: "syllabus-review",
          review: props.initialReview,
        },
      ];
    }
    return [];
  });
  const reviewSectionRef = useRef<HTMLDivElement | null>(null);

  const inputFields = useMemo(
    () => extractSyllabusInputFields(currentSeason?.formSyllabus),
    [currentSeason?.formSyllabus]
  );
  const fieldNames = useMemo(
    () => inputFields.map((f) => f.name),
    [inputFields]
  );

  const findField = (labelOrId: string) =>
    inputFields.find((f) => f.name === labelOrId || f.id === labelOrId);

  const references = currentSeason?.aiSettings?.references || [];
  const guidelines = (currentSeason?.aiSettings?.guidelines || "").trim();
  const exampleSyllabusCount =
    currentSeason?.aiSettings?.exampleSyllabusIds?.length || 0;
  const filledCount = useMemo(() => {
    const info = props.courseMoreInfo.current || {};
    return inputFields.filter((f) => isSyllabusFieldFilled(info, f)).length;
  }, [inputFields, review]);
  const showPrep = !isWorking && messages.length === 0 && !review;

  useEffect(() => {
    if (references.length === 0) {
      setSelectedRefIndexes([]);
      return;
    }
    setSelectedRefIndexes((prev) => {
      const valid = prev.filter((i) => i < references.length);
      if (valid.length > 0) return valid.slice(0, 2);
      return references.slice(0, 2).map((_, i) => i);
    });
  }, [references.length]);

  useEffect(() => {
    if (!props.openToResults || !review) return;
    const t = window.setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(t);
  }, [props.openToResults, review]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isWorking, steps.length]);

  const toggleReference = (index: number) => {
    setSelectedRefIndexes((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= 2) return [...prev.slice(1), index];
      return [...prev, index];
    });
  };

  const buildContext = (extra?: Record<string, any>) => ({
    subject: props.courseSubject,
    classTitle: props.courseTitle,
    currentInfo: props.courseMoreInfo.current || {},
    formSyllabus: currentSeason?.formSyllabus,
    referenceIndexes: selectedRefIndexes,
    reviewSummary: review?.summary,
    ...extra,
  });

  const getMissingRequiredFields = () => {
    const info = props.courseMoreInfo.current || {};
    const fromMeta = inputFields
      .filter((f) => f.required)
      .filter((f) => !isSyllabusFieldFilled(info, f))
      .map((f) => f.name);

    if (fromMeta.length > 0) return fromMeta;

    const emptyDom: string[] = [];
    document
      .querySelectorAll("div[data-inputrequired=true]")
      .forEach((node, index) => {
        const text = (node.textContent || "").trim();
        const html = (node as HTMLElement).innerHTML;
        if (!text || html === "" || html === undefined) {
          emptyDom.push(`필수 항목 ${index + 1}`);
        }
      });
    return emptyDom;
  };

  const parseSseAlter = async (
    response: Response,
    onStep: (message: string) => void
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
    let errorMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ") && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            if (eventType === "step") {
              onStep(data.message || "");
            } else if (eventType === "error") {
              errorMessage =
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

    if (errorMessage) throw new Error(errorMessage);
    return result;
  };

  const runReviewSkill = async () => {
    const missingRequired = getMissingRequiredFields();
    if (missingRequired.length > 0) {
      const msg = `필수 항목을 작성한 뒤 점검해 주세요. (미작성: ${missingRequired.join(
        ", "
      )})`;
      setError(msg);
      return;
    }

    setIsWorking(true);
    setError("");
    setSteps([]);
    setAppliedFields(new Set());

    const snapshot = { ...(props.courseMoreInfo.current || {}) };
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: "user",
        content: "강의계획서 전체를 점검해 주세요.",
        skill: "syllabus-review",
      },
    ]);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SERVER_URL}/api/ai/alter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: abortController.signal,
          body: JSON.stringify({
            season: currentSeason?._id,
            skill: "syllabus-review",
            message: "강의계획서 전체를 점검해 주세요.",
            context: buildContext(),
          }),
        }
      );

      const result = await parseSseAlter(response, (message) => {
        setSteps((prev) => [
          ...prev.map((s) => ({ ...s, completed: true })),
          { message, completed: false },
        ]);
      });
      setSteps((prev) => prev.map((s) => ({ ...s, completed: true })));

      const nextReview = result.review || null;
      setReview(nextReview);
      setReviewedInfo(snapshot);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            result.message ||
            nextReview?.summary ||
            "점검 결과를 정리했습니다.",
          skill: "syllabus-review",
          review: nextReview,
        },
      ]);

      if (!nextReview) {
        setError("점검 결과를 받지 못했습니다.");
      } else {
        props.onReviewComplete?.({
          review: nextReview,
          reviewedInfo: snapshot,
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      ALERT_ERROR(err);
      setError(
        MESSAGE.get(err.response?.data?.message || err.message) ||
          "AI 점검에 실패했습니다."
      );
    } finally {
      setIsWorking(false);
      abortControllerRef.current = null;
    }
  };

  const runChatFollowUp = async (text: string) => {
    if (!text.trim() || isWorking) return;

    const wantsReview =
      /^(점검|리뷰|피드백)/.test(text.trim()) ||
      /계획서.*(점검|리뷰)/.test(text.trim()) ||
      /\/(점검|review)/i.test(text.trim());

    if (wantsReview) {
      setDraftMessage("");
      await runReviewSkill();
      return;
    }

    setIsWorking(true);
    setError("");
    setSteps([]);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      skill: "chat",
    };
    const nextHistory = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setDraftMessage("");

    try {
      setSteps([{ message: "Alter가 답변을 준비하고 있습니다...", completed: false }]);

      const response = await fetch(
        `${process.env.REACT_APP_SERVER_URL}/api/ai/alter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: abortController.signal,
          body: JSON.stringify({
            season: currentSeason?._id,
            skill: "chat",
            message: text.trim(),
            history: nextHistory.slice(0, -1),
            context: buildContext(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          MESSAGE.get(data.message) || data.message || "AI 요청에 실패했습니다."
        );
      }

      // chat skill returns JSON; review returns SSE — handle both
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const result = await parseSseAlter(response, (message) => {
          setSteps((prev) => [
            ...prev.map((s) => ({ ...s, completed: true })),
            { message, completed: false },
          ]);
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: result.message || result.review?.summary || "",
            skill: result.skill || "chat",
            review: result.review,
          },
        ]);
        if (result.review) {
          setReview(result.review);
          const snapshot = { ...(props.courseMoreInfo.current || {}) };
          setReviewedInfo(snapshot);
          props.onReviewComplete?.({
            review: result.review,
            reviewedInfo: snapshot,
          });
        }
      } else {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.message || "",
            skill: data.skill || "chat",
          },
        ]);
      }
      setSteps((prev) => prev.map((s) => ({ ...s, completed: true })));
    } catch (err: any) {
      if (err.name === "AbortError") return;
      ALERT_ERROR(err);
      setError(
        MESSAGE.get(err.response?.data?.message || err.message) ||
          "AI 응답에 실패했습니다."
      );
    } finally {
      setIsWorking(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    props.setPopupActive(false);
  };

  const scrollToReview = () => {
    reviewSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const applySuggestion = (fieldLabel: string, suggestion: string) => {
    if (!suggestion?.trim()) return;
    const meta = findField(fieldLabel);
    const storageKey = meta?.id || fieldLabel;
    const next = {
      ...(props.courseMoreInfo.current || {}),
      [storageKey]: suggestion,
    };
    if (meta?.name && meta.name !== storageKey && meta.name in next) {
      delete next[meta.name];
    }
    props.courseMoreInfo.current = next;
    props.onInfoUpdate?.(next);
    setReviewedInfo((prev) => ({ ...prev, [storageKey]: suggestion }));
    setAppliedFields((prev) => new Set(prev).add(fieldLabel));
  };

  const levelClass = (level: string) => {
    if (level === "good") return style.levelGood;
    if (level === "fair") return style.levelFair;
    if (level === "empty") return style.levelEmpty;
    return style.levelNeeds;
  };

  const formatDraft = (value: any) => {
    if (value == null || value === "") return "(미작성)";
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  };

  const latestReviewMessage = [...messages]
    .reverse()
    .find((m) => m.review);

  return (
    <Popup
      setState={props.setPopupActive}
      title={
        <>
          <AlterAIIcon size={22} />
          {review && (
            <AlterReviewBadge
              overallLevel={review.overallLevel}
              onClick={scrollToReview}
              size="sm"
            />
          )}
          Alter
        </>
      }
      closeBtn
      contentScroll
      style={{ width: "720px", maxWidth: "95vw", borderRadius: "12px" }}
      footer={
        <div className={style.footer}>
          {showPrep && (
            <Button type="ghost" onClick={runReviewSkill} disabled={isWorking}>
              점검 시작
            </Button>
          )}
          <Button type="ghost" onClick={handleCancel}>
            {messages.length > 0 ? "마침" : "취소"}
          </Button>
        </div>
      }
    >
      <div className={style.root}>
        <p className={style.intro}>
          {showPrep
            ? "저장된 작성 지침과 참고 자료를 확인한 뒤 「점검 시작」을 누르면 Alter가 전 항목을 평가합니다. 이후 대화로 이어서 다듬을 수 있습니다."
            : "Alter는 챗봇형 도우미입니다. 점검 결과에 대해 질문하거나 특정 항목 개선을 요청해 보세요."}
        </p>

        {error && <div className={style.error}>{error}</div>}

        <div className={style.block}>
          <div className={style.metaCard}>
            <div className={style.metaItem}>
              <span className={style.metaKey}>교과목</span>
              <span className={style.metaValue}>
                {props.courseSubject.length > 0
                  ? _.join(props.courseSubject, " / ")
                  : "(미입력)"}
              </span>
            </div>
            <div className={style.metaItem}>
              <span className={style.metaKey}>수업명</span>
              <span className={style.metaValue}>
                {props.courseTitle || "(미입력)"}
              </span>
            </div>
            <div className={style.metaItem}>
              <span className={style.metaKey}>작성된 항목</span>
              <span className={style.metaValue}>
                {filledCount} / {fieldNames.length || "?"}
              </span>
            </div>
          </div>
        </div>

        {showPrep && (
          <>
            <div className={style.block}>
              <div className={style.blockHeader}>
                <h4 className={style.label}>저장된 작성 지침</h4>
              </div>
              <div className={style.panel}>
                {guidelines ? (
                  <p className={style.guidelinesText}>{guidelines}</p>
                ) : (
                  <p className={style.panelHint}>
                    학기에 저장된 작성 지침이 없습니다. 기본 기준으로
                    점검합니다.
                  </p>
                )}
                {exampleSyllabusCount > 0 && (
                  <p className={style.panelHint}>
                    모범 답안 {exampleSyllabusCount}개가 스타일·완성도 기준으로
                    함께 반영됩니다.
                  </p>
                )}
              </div>
            </div>

            {references.length > 0 ? (
              <div className={style.block}>
                <div className={style.blockHeader}>
                  <h4 className={style.label}>참고 자료</h4>
                  <span className={style.optional}>최대 2개 선택</span>
                </div>
                <div className={style.panel}>
                  <p className={style.panelHint}>
                    점검에 포함할 참고 자료를 선택하세요.
                  </p>
                  <div className={style.refList}>
                    {references.map((ref, index) => {
                      const checked = selectedRefIndexes.includes(index);
                      return (
                        <label
                          key={`${ref.title}-${index}`}
                          className={`${style.refRow} ${
                            checked ? style.refRowChecked : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleReference(index)}
                          />
                          <span className={style.refTitle}>
                            {ref.title || `참고자료 ${index + 1}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className={style.block}>
                <div className={style.blockHeader}>
                  <h4 className={style.label}>참고 자료</h4>
                </div>
                <div className={style.panel}>
                  <p className={style.panelHint}>
                    학기에 등록된 참고 자료가 없습니다.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {(messages.length > 0 || isWorking) && (
          <div className={style.block}>
            <div className={style.blockHeader}>
              <h4 className={style.label}>대화</h4>
            </div>
            <div className={style.chatList}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${style.chatBubble} ${
                    msg.role === "user" ? style.chatUser : style.chatAssistant
                  }`}
                >
                  <div className={style.chatMeta}>
                    {msg.role === "user" ? "나" : "Alter"}
                    {msg.skill && (
                      <span className={style.skillChip}>{msg.skill}</span>
                    )}
                  </div>
                  <p className={style.chatText}>{msg.content}</p>
                </div>
              ))}
              {isWorking && steps.length > 0 && (
                <div className={`${style.chatBubble} ${style.chatAssistant}`}>
                  <div className={style.chatMeta}>Alter</div>
                  <div className={style.steps}>
                    {steps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`${style.step} ${
                          step.completed ? style.stepDone : ""
                        }`}
                      >
                        <span
                          className={`${style.stepMark} ${
                            step.completed ? style.stepMarkDone : ""
                          }`}
                        >
                          {step.completed ? "✓" : idx + 1}
                        </span>
                        <div>{step.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {latestReviewMessage?.review && !isWorking && (
          <div className={style.block} ref={reviewSectionRef}>
            <div className={style.blockHeader}>
              <h4 className={style.label}>점검 결과</h4>
              <span
                className={`${style.levelChip} ${levelClass(
                  latestReviewMessage.review.overallLevel
                )}`}
              >
                {REVIEW_LEVEL_LABEL[latestReviewMessage.review.overallLevel] ||
                  latestReviewMessage.review.overallLevel}
              </span>
            </div>
            <p className={style.previewHint}>
              {latestReviewMessage.review.summary}
            </p>
            <div className={style.reviewList}>
              {latestReviewMessage.review.items.map((item) => {
                const meta = findField(item.field);
                const draftText = formatDraft(
                  meta
                    ? readSyllabusInfoValue(reviewedInfo, meta)
                    : reviewedInfo[item.field]
                );
                return (
                  <div key={item.field} className={style.reviewItem}>
                    <div className={style.reviewItemHeader}>
                      <strong>{item.field}</strong>
                      <span
                        className={`${style.levelChip} ${levelClass(
                          item.level
                        )}`}
                      >
                        {REVIEW_LEVEL_LABEL[item.level] || item.level}
                      </span>
                    </div>

                    <div className={style.draftBox}>
                      <p className={style.draftLabel}>작성된 내용</p>
                      <p className={style.draftText}>{draftText}</p>
                    </div>

                    {item.comment && (
                      <p className={style.reviewComment}>{item.comment}</p>
                    )}
                    {item.suggestion && (
                      <div className={style.suggestionBox}>
                        <p className={style.draftLabel}>개선 제안</p>
                        <p className={style.suggestionText}>
                          {item.suggestion}
                        </p>
                        <Button
                          type="ghost"
                          onClick={() =>
                            applySuggestion(item.field, item.suggestion)
                          }
                          disabled={appliedFields.has(item.field)}
                        >
                          {appliedFields.has(item.field)
                            ? "반영됨"
                            : "이 제안 반영"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!showPrep && (
          <div className={style.block}>
            <div className={style.chatComposer}>
              <textarea
                className={style.textarea}
                value={draftMessage}
                disabled={isWorking}
                placeholder="예: 교재 항목만 더 구체적으로 다듬어줘 / 다시 점검해줘"
                rows={3}
                onChange={(e) => setDraftMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void runChatFollowUp(draftMessage);
                  }
                }}
              />
              <Button
                type="ghost"
                disabled={isWorking || !draftMessage.trim()}
                onClick={() => void runChatFollowUp(draftMessage)}
              >
                보내기
              </Button>
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
};

export default Index;
