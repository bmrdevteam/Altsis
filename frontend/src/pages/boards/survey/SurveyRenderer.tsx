import { useEffect, useRef, useState } from "react";
import style from "./survey.module.scss";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TPost } from "types/post";
import {
  TSurveyAnswer,
  TSurveyQuestion,
  TSurveyResponse,
  TSurveyFileInfo,
} from "types/survey";

type Props = {
  post: TPost;
  currentUserId: string;
};

type ToastState = { message: string; type: "success" | "error" } | null;

const SurveyRenderer = ({ post, currentUserId }: Props) => {
  const { SurveyResponseAPI } = useAPIv2();
  const [myResponse, setMyResponse] = useState<TSurveyResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, TSurveyAnswer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState>(null);

  const survey = post.survey!;
  const isClosed =
    survey.settings.deadline && new Date() > new Date(survey.settings.deadline);

  useEffect(() => {
    SurveyResponseAPI.RSurveyResponseMy({ query: { post: post._id } })
      .then(({ surveyResponse }) => {
        setMyResponse(surveyResponse);
        if (surveyResponse) {
          const map: Record<string, TSurveyAnswer> = {};
          for (const a of surveyResponse.answers) {
            map[a.questionId] = a;
          }
          setAnswers(map);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [post._id]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setAnswer = (questionId: string, partial: Partial<TSurveyAnswer>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { questionId }),
        questionId,
        ...partial,
      },
    }));
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    const answerList = Object.values(answers);

    const newErrors: Record<string, string> = {};
    for (const q of survey.questions) {
      if (!q.isRequired) continue;
      const a = answerList.find((a) => a.questionId === q.id);
      if (q.type === "fileUpload") {
        if (!a?.files?.length) {
          newErrors[q.id] = "필수 질문입니다. 파일을 업로드해주세요.";
        }
      } else {
        if (
          !a ||
          a.value === undefined ||
          a.value === null ||
          a.value === "" ||
          (Array.isArray(a.value) && a.value.length === 0)
        ) {
          newErrors[q.id] = "필수 질문입니다. 답변을 입력해주세요.";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorId = Object.keys(newErrors)[0];
      document
        .getElementById(`question-${firstErrorId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      if (myResponse && survey.settings.allowModify) {
        const { surveyResponse } = await SurveyResponseAPI.USurveyResponse({
          params: { _id: myResponse._id },
          data: { answers: answerList },
        });
        setMyResponse(surveyResponse);
        showToast("응답이 수정되었습니다.");
      } else {
        const { surveyResponse } = await SurveyResponseAPI.CSurveyResponse({
          data: { post: post._id, answers: answerList },
        });
        setMyResponse(surveyResponse);
        showToast("응답이 제출되었습니다.");
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={style.noResultsMessage}>설문 로드 중...</div>
    );
  }

  const isReadOnly = (!!myResponse && !survey.settings.allowModify) || !!isClosed;

  const answeredCount = survey.questions.filter((q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === "fileUpload") return (a.files?.length || 0) > 0;
    return (
      a.value !== undefined &&
      a.value !== null &&
      a.value !== "" &&
      (!Array.isArray(a.value) || a.value.length > 0)
    );
  }).length;
  const totalCount = survey.questions.length;
  const progressPct =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* 상태 표시 */}
      <div className={style.surveyMeta}>
        {isClosed && <span className={style.closedBadge}>마감됨</span>}
        {myResponse && <span className={style.submittedBadge}>응답 완료</span>}
        {survey.settings.isAnonymous && (
          <span className={style.anonymousBadge}>익명 설문</span>
        )}
        {survey.settings.deadline && !isClosed && (
          <span className={style.deadlineText}>
            마감: {new Date(survey.settings.deadline).toLocaleString("ko-KR")}
            {getDeadlineRemaining(survey.settings.deadline) && (
              <> ({getDeadlineRemaining(survey.settings.deadline)})</>
            )}
          </span>
        )}
      </div>

      {/* 응답 완료 배너 */}
      {myResponse && isReadOnly && (
        <div className={style.successBanner}>
          <span className={style.successIcon}>✓</span>
          <div className={style.successText}>
            <strong>응답이 완료되었습니다</strong>
            <span>
              응답일시:{" "}
              {new Date(
                myResponse.updatedAt || myResponse.createdAt
              ).toLocaleString("ko-KR")}
            </span>
          </div>
        </div>
      )}

      {/* 진행률 표시 */}
      {!isReadOnly && totalCount > 0 && (
        <div className={style.progressArea}>
          <div className={style.progressBar}>
            <div
              className={style.progressFill}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className={style.progressText}>
            {answeredCount}/{totalCount} 질문 응답
          </span>
        </div>
      )}

      {/* 질문 목록 */}
      {survey.questions.map((q, idx) => (
        <QuestionField
          key={q.id}
          index={idx}
          question={q}
          answer={answers[q.id]}
          readOnly={isReadOnly}
          error={errors[q.id]}
          onAnswer={(partial) => setAnswer(q.id, partial)}
          postId={post._id}
        />
      ))}

      {/* 제출/수정 버튼 */}
      {!isReadOnly && (
        <div className={style.submitArea}>
          <Button type="ghost" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "처리 중..."
              : myResponse
              ? "응답 수정"
              : "응답 제출"}
          </Button>
        </div>
      )}

      {/* Toast 알림 */}
      {toast && (
        <div className={style.toastContainer}>
          <div
            className={`${style.toast} ${
              toast.type === "success" ? style.toastSuccess : style.toastError
            }`}
          >
            <span className={style.toastIcon}>
              {toast.type === "success" ? "✓" : "!"}
            </span>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── 마감 남은 시간 계산 ─── */

const getDeadlineRemaining = (deadline: string): string | null => {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
};

/* ─── 개별 질문 렌더러 ─── */

type QuestionFieldProps = {
  index: number;
  question: TSurveyQuestion;
  answer?: TSurveyAnswer;
  readOnly: boolean;
  error?: string;
  onAnswer: (partial: Partial<TSurveyAnswer>) => void;
  postId: string;
};

const QuestionField = ({
  index,
  question,
  answer,
  readOnly,
  error,
  onAnswer,
  postId,
}: QuestionFieldProps) => {
  const { SurveyResponseAPI } = useAPIv2();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const fileInfo = await SurveyResponseAPI.CSurveyFileUpload({
        query: { post: postId },
        data: formData,
      });

      onAnswer({
        files: [...(answer?.files || []), fileInfo],
      });
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const removeFile = (key: string) => {
    onAnswer({
      files: (answer?.files || []).filter((f) => f.key !== key),
    });
  };

  const questionItemClass = `${style.questionItem}${
    error ? ` ${style.questionItemError}` : ""
  }`;

  return (
    <div className={questionItemClass} id={`question-${question.id}`}>
      <div className={style.questionLabel}>
        <span className={style.questionTitle}>
          {question.title}
          {question.isRequired && (
            <span className={style.requiredMark}>*</span>
          )}
        </span>
      </div>
      {question.description && (
        <div className={style.questionDesc}>{question.description}</div>
      )}

      {/* 질문 첨부파일 표시 */}
      {question.attachments && question.attachments.length > 0 && (
        <div className={style.attachmentList}>
          {question.attachments.map((att) => (
            <QuestionAttachment key={att.key} file={att} />
          ))}
        </div>
      )}

      {/* 질문 유형별 입력 */}
      {question.type === "singleChoice" && (
        <div>
          {(question.options || []).map((opt) => (
            <label key={opt.id} className={style.choiceOption}>
              <input
                type="radio"
                name={`q_${question.id}`}
                value={opt.id}
                checked={answer?.value === opt.id}
                disabled={readOnly}
                onChange={() => onAnswer({ value: opt.id })}
              />
              {opt.text}
            </label>
          ))}
        </div>
      )}

      {question.type === "multipleChoice" && (
        <div>
          {(question.options || []).map((opt) => {
            const selected = Array.isArray(answer?.value)
              ? (answer!.value as string[])
              : [];
            return (
              <label key={opt.id} className={style.choiceOption}>
                <input
                  type="checkbox"
                  value={opt.id}
                  checked={selected.includes(opt.id)}
                  disabled={readOnly}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt.id]
                      : selected.filter((v) => v !== opt.id);
                    onAnswer({ value: next });
                  }}
                />
                {opt.text}
              </label>
            );
          })}
        </div>
      )}

      {question.type === "shortText" && (
        <input
          type="text"
          className={style.textInput}
          value={(answer?.value as string) || ""}
          disabled={readOnly}
          onChange={(e) => onAnswer({ value: e.target.value })}
          placeholder="답변을 입력하세요"
        />
      )}

      {question.type === "longText" && (
        <textarea
          className={style.textArea}
          value={(answer?.value as string) || ""}
          disabled={readOnly}
          onChange={(e) => onAnswer({ value: e.target.value })}
          placeholder="답변을 입력하세요"
          rows={4}
        />
      )}

      {question.type === "rating" && (
        <div className={style.starGroup} role="radiogroup" aria-label="평점">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              className={`${style.star} ${
                (answer?.value as number) >= v ? style.active : ""
              } ${readOnly ? style.readonly : ""}`}
              onClick={() => !readOnly && onAnswer({ value: v })}
              disabled={readOnly}
              aria-label={`${v}점`}
              tabIndex={0}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {question.type === "linearScale" && (
        <div className={style.scaleGroup}>
          {question.scaleMinLabel && (
            <span className={style.scaleLabel}>{question.scaleMinLabel}</span>
          )}
          {Array.from(
            { length: (question.scaleMax || 5) - (question.scaleMin || 1) + 1 },
            (_, i) => (question.scaleMin || 1) + i
          ).map((v) => (
            <label key={v} className={style.scaleOption}>
              <input
                type="radio"
                name={`q_${question.id}`}
                value={v}
                checked={Number(answer?.value) === v}
                disabled={readOnly}
                onChange={() => onAnswer({ value: v })}
              />
              <span>{v}</span>
            </label>
          ))}
          {question.scaleMaxLabel && (
            <span className={style.scaleLabel}>{question.scaleMaxLabel}</span>
          )}
        </div>
      )}

      {question.type === "dropdown" && (
        <select
          className={style.selectInput}
          value={(answer?.value as string) || ""}
          disabled={readOnly}
          onChange={(e) => onAnswer({ value: e.target.value })}
        >
          <option value="">선택해주세요</option>
          {(question.options || []).map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.text}
            </option>
          ))}
        </select>
      )}

      {question.type === "date" && (
        <input
          type="date"
          className={style.dateInput}
          value={(answer?.value as string) || ""}
          disabled={readOnly}
          onChange={(e) => onAnswer({ value: e.target.value })}
        />
      )}

      {question.type === "fileUpload" && (
        <div className={style.fileUploadArea}>
          {(answer?.files || []).map((f) => (
            <div key={f.key} className={style.uploadedFile}>
              <span className={style.uploadedFileName}>{f.fileName}</span>
              <span className={style.uploadedFileSize}>
                ({Math.round(f.fileSize / 1024)}KB)
              </span>
              {!readOnly && (
                <button
                  type="button"
                  className={style.removeBtn}
                  onClick={() => removeFile(f.key)}
                  aria-label={`${f.fileName} 삭제`}
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {uploading && (
            <div className={style.uploadProgress}>업로드 중...</div>
          )}

          {!readOnly &&
            !uploading &&
            (answer?.files?.length || 0) < (question.maxFiles || 1) && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  className={style.fileInput}
                  onChange={handleFileUpload}
                />
                <div
                  className={`${style.fileDropZone} ${
                    isDragging ? style.fileDropZoneActive : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileRef.current?.click();
                    }
                  }}
                  aria-label="파일 업로드"
                >
                  <span className={style.fileDropIcon}>📎</span>
                  <span className={style.fileDropText}>
                    파일을 드래그하거나{" "}
                    <span className={style.fileDropBrowse}>클릭하여 선택</span>
                  </span>
                  <span className={style.fileTypeHint}>
                    이미지, PDF, 문서 파일 허용 · 최대{" "}
                    {Math.round(
                      (question.maxFileSize || 10485760) / 1048576
                    )}
                    MB · {(answer?.files?.length || 0)}/
                    {question.maxFiles || 1}개
                  </span>
                </div>
              </>
            )}
        </div>
      )}

      {/* 유효성 에러 메시지 */}
      {error && <div className={style.errorMessage}>⚠ {error}</div>}
    </div>
  );
};

/* ─── 질문 첨부파일 표시 ─── */

const QuestionAttachment = ({ file }: { file: TSurveyFileInfo }) => {
  const { SurveyResponseAPI } = useAPIv2();
  const [url, setUrl] = useState<string | null>(null);
  const isImage = file.mimeType?.startsWith("image/");

  useEffect(() => {
    if (isImage && !url) {
      SurveyResponseAPI.RSurveyFileSignedUrl({
        query: { key: file.key, fileName: file.fileName },
      })
        .then(({ preSignedUrl }) => setUrl(preSignedUrl))
        .catch(() => {});
    }
  }, [file.key]);

  const handleClick = async () => {
    try {
      const { preSignedUrl } = await SurveyResponseAPI.RSurveyFileSignedUrl({
        query: { key: file.key, fileName: file.fileName },
      });
      window.open(preSignedUrl, "_blank");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  return (
    <div>
      {isImage && url ? (
        <img src={url} alt={file.fileName} className={style.attachmentImage} />
      ) : (
        <button
          type="button"
          className={style.addOptionBtn}
          onClick={handleClick}
        >
          {file.fileName}
        </button>
      )}
    </div>
  );
};

export default SurveyRenderer;
