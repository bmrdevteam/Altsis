/**
 * @file AI Generate Popup
 * @page 수업 개설 뷰 - AI 내용 생성 팝업
 *
 * @author AI Assistant
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.1 - SSE streaming with progress steps
 *
 */
import { useState, useRef } from "react";
import { useAuth } from "contexts/authContext";

import style from "style/pages/courses/course.module.scss";

// components
import Popup from "components/popup/Popup";
import Button from "components/button/Button";

import _ from "lodash";
import { ALERT_ERROR } from "hooks/useAPIv2";

type StepInfo = {
  message: string;
  detail?: string;
  completed: boolean;
};

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  courseSubject: string[];
  courseTitle: string;
  courseMoreInfo: React.MutableRefObject<any>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const Index = (props: Props) => {
  const { currentSeason, currentRegistration } = useAuth();

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [streamingText, setStreamingText] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateContent = async () => {
    setIsGenerating(true);
    setError("");
    setGeneratedContent(null);
    setSteps([]);
    setStreamingText("");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const context = {
        subject: props.courseSubject,
        classTitle: props.courseTitle,
        currentInfo: props.courseMoreInfo.current,
        formSyllabus: currentSeason?.formSyllabus,
      };

      const enrollments = currentRegistration
        ? [
            {
              role: currentRegistration.role,
              userId: currentRegistration.userId,
              userName: currentRegistration.userName,
            },
          ]
        : [];

      const response = await fetch(
        `${process.env.REACT_APP_SERVER_URL}/api/ai/syllabus/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: abortController.signal,
          body: JSON.stringify({
            season: currentSeason?._id,
            context,
            enrollments,
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("AI 내용 생성에 실패했습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              handleSSEEvent(eventType, data);
            } catch {
              // ignore parse errors
            }
            eventType = "";
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      ALERT_ERROR(err);
      const message = err.response?.data?.message || err.message;
      if (message === "AI_NOT_ENABLED") {
        setError("AI 기능이 활성화되지 않았습니다.");
      } else if (message === "AI_NOT_ENABLED_FOR_SEASON") {
        setError("이 학기에서 AI 기능이 활성화되지 않았습니다.");
      } else if (message === "AI_PERMISSION_DENIED") {
        setError("AI 사용 권한이 없습니다.");
      } else {
        setError("AI 내용 생성에 실패했습니다.");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleSSEEvent = (event: string, data: any) => {
    switch (event) {
      case "step":
        setSteps((prev) => {
          // Mark previous steps as completed
          const updated = prev.map((s) => ({ ...s, completed: true }));
          return [
            ...updated,
            {
              message: data.message,
              detail: data.detail,
              completed: false,
            },
          ];
        });
        break;
      case "generating":
        setStreamingText((prev) => prev + data.text);
        break;
      case "done": {
        setSteps((prev) => prev.map((s) => ({ ...s, completed: true })));
        setStreamingText("");
        const content = data.content;
        const isEmptyRaw =
          content &&
          typeof content === "object" &&
          Object.keys(content).length === 1 &&
          "raw" in content &&
          !String(content.raw || "").trim();
        if (!content || isEmptyRaw) {
          setError(
            "AI가 내용을 생성하지 못했습니다. 모델 설정을 확인하거나 다시 시도해주세요."
          );
          setGeneratedContent(null);
        } else {
          setGeneratedContent(content);
        }
        break;
      }
      case "error": {
        const message = data.message;
        if (message === "AI_NOT_ENABLED") {
          setError("AI 기능이 활성화되지 않았습니다.");
        } else if (message === "AI_NOT_ENABLED_FOR_SEASON") {
          setError("이 학기에서 AI 기능이 활성화되지 않았습니다.");
        } else {
          setError(message || "AI 내용 생성에 실패했습니다.");
        }
        break;
      }
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    props.setPopupActive(false);
  };

  const applyContent = () => {
    if (generatedContent) {
      props.setIsLoading(true);
      props.courseMoreInfo.current = generatedContent;
      props.setPopupActive(false);
      setTimeout(() => props.setIsLoading(false), 300);
    }
  };

  return (
    <Popup
      setState={props.setPopupActive}
      title={"AI로 강의계획서 내용 생성"}
      closeBtn
      contentScroll
      style={{ width: "600px" }}
    >
      <div className={style.section}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            현재 입력된 정보
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--background-secondary)",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          >
            <div>
              <strong>교과목:</strong>{" "}
              {props.courseSubject.length > 0
                ? _.join(props.courseSubject, " / ")
                : "(미입력)"}
            </div>
            <div style={{ marginTop: "4px" }}>
              <strong>수업명:</strong> {props.courseTitle || "(미입력)"}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--danger-background)",
              color: "var(--danger)",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        {isGenerating && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
              생성 진행 상황
            </div>
            <div
              style={{
                padding: "12px",
                backgroundColor: "var(--background-secondary)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
            >
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    marginBottom: "6px",
                    color: step.completed
                      ? "var(--text-secondary)"
                      : "var(--text-primary)",
                  }}
                >
                  <span style={{ flexShrink: 0, width: "16px" }}>
                    {step.completed ? "\u2714" : "\u25CB"}
                  </span>
                  <div>
                    <div>{step.message}</div>
                    {step.detail && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginTop: "2px",
                        }}
                      >
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px",
                    backgroundColor: "var(--background-tertiary)",
                    borderRadius: "4px",
                    whiteSpace: "pre-wrap",
                    fontSize: "13px",
                    maxHeight: "200px",
                    overflow: "auto",
                    lineHeight: "1.5",
                  }}
                >
                  {streamingText}
                </div>
              )}
            </div>
          </div>
        )}

        {generatedContent && !isGenerating && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
              생성된 내용 미리보기
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              AI가 생성한 초안입니다. 부정확한 내용이 있을 수 있으니 반드시
              검토하고 수정한 뒤 사용하세요.
            </div>
            <div
              style={{
                padding: "12px",
                backgroundColor: "var(--background-secondary)",
                borderRadius: "8px",
                fontSize: "14px",
                maxHeight: "300px",
                overflow: "auto",
              }}
            >
              {Object.keys(generatedContent).map((key) => (
                <div key={key} style={{ marginBottom: "8px" }}>
                  <strong>{key}:</strong>
                  <div
                    style={{
                      marginTop: "4px",
                      whiteSpace: "pre-wrap",
                      paddingLeft: "12px",
                    }}
                  >
                    {typeof generatedContent[key] === "string"
                      ? generatedContent[key]
                      : JSON.stringify(generatedContent[key], null, 2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          {!generatedContent && !isGenerating && (
            <Button type="ghost" onClick={generateContent}>
              AI로 생성
            </Button>
          )}
          {generatedContent && !isGenerating && (
            <>
              <Button type="ghost" onClick={generateContent}>
                다시 생성
              </Button>
              <Button type="ghost" onClick={applyContent}>
                적용
              </Button>
            </>
          )}
          <Button type="ghost" onClick={handleCancel}>
            취소
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default Index;
