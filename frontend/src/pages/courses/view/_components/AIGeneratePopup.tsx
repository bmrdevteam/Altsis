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
 * @version 1.0
 *
 */
import { useState } from "react";
import { useAuth } from "contexts/authContext";

import style from "style/pages/courses/course.module.scss";

// components
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Loading from "components/loading/Loading";

import _ from "lodash";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  courseSubject: string[];
  courseTitle: string;
  courseMoreInfo: React.MutableRefObject<any>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const Index = (props: Props) => {
  const { currentSeason, currentRegistration } = useAuth();
  const { AIAPI } = useAPIv2();

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const generateContent = async () => {
    setIsGenerating(true);
    setError("");

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

      const { content } = await AIAPI.GenerateSyllabusContent({
        data: {
          season: currentSeason?._id,
          context,
          enrollments,
        },
      });

      setGeneratedContent(content);
    } catch (err: any) {
      ALERT_ERROR(err);
      const message = err.response?.data?.message;
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
    }
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
          <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
            <Loading height="100px" />
          </div>
        )}

        {generatedContent && !isGenerating && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
              생성된 내용 미리보기
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
          <Button
            type="ghost"
            onClick={() => props.setPopupActive(false)}
          >
            취소
          </Button>
        </div>
      </div>
    </Popup>
  );
};

export default Index;
