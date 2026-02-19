import { useRef, useState } from "react";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import style from "./survey.module.scss";
import { TSurvey, TSurveyExportData } from "types/survey";

type Props = {
  setState: (state: boolean) => void;
  onImport: (survey: TSurvey) => void;
};

const SurveyImportPopup = ({ setState, onImport }: Props) => {
  const [parsed, setParsed] = useState<TSurveyExportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith(".json")) {
      setError("JSON 파일만 가져올 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.version || !data.survey || !data.survey.questions) {
          setError("유효한 설문 내보내기 파일이 아닙니다.");
          return;
        }
        setParsed(data);
        setError(null);
      } catch {
        setError("JSON 파일을 파싱할 수 없습니다.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsed) return;

    const survey: TSurvey = {
      title: parsed.survey.title || "",
      description: parsed.survey.description || "",
      questions: parsed.survey.questions.map((q) => ({
        id: crypto.randomUUID(),
        type: q.type,
        title: q.title,
        description: q.description,
        isRequired: q.isRequired,
        ...(q.options && {
          options: q.options.map((opt) => ({
            id: crypto.randomUUID(),
            text: opt.text,
          })),
        }),
        ...(q.scaleMin !== undefined && { scaleMin: q.scaleMin }),
        ...(q.scaleMax !== undefined && { scaleMax: q.scaleMax }),
        ...(q.scaleMinLabel && { scaleMinLabel: q.scaleMinLabel }),
        ...(q.scaleMaxLabel && { scaleMaxLabel: q.scaleMaxLabel }),
        ...(q.maxFiles !== undefined && { maxFiles: q.maxFiles }),
        ...(q.maxFileSize !== undefined && { maxFileSize: q.maxFileSize }),
      })),
      settings: {
        isAnonymous: parsed.survey.settings.isAnonymous ?? false,
        showResults: parsed.survey.settings.showResults ?? "afterResponse",
        deadline: null,
        allowModify: parsed.survey.settings.allowModify ?? false,
      },
      responseCount: 0,
    };

    onImport(survey);
    setState(false);
  };

  return (
    <Popup
      setState={setState}
      title="설문 가져오기"
      closeBtn
      style={{ maxWidth: "520px", width: "100%" }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <Button type="ghost" onClick={() => setState(false)}>
            취소
          </Button>
          <Button type="ghost" onClick={handleImport} disabled={!parsed}>
            가져오기
          </Button>
        </div>
      }
    >
      <div className={style.importContent}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {!parsed ? (
          <div
            className={style.importDropzone}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={style.importDropzoneText}>
              JSON 파일을 선택하세요
            </span>
            <span className={style.importDropzoneHint}>
              설문 내보내기로 생성된 .json 파일
            </span>
          </div>
        ) : (
          <div className={style.importPreview}>
            <div className={style.importPreviewHeader}>
              <span className={style.importPreviewTitle}>
                {parsed.survey.title || "제목 없음"}
              </span>
              <button
                type="button"
                className={style.importChangeBtn}
                onClick={() => {
                  setParsed(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                다른 파일
              </button>
            </div>
            {parsed.survey.description && (
              <p className={style.importPreviewDesc}>
                {parsed.survey.description}
              </p>
            )}
            <div className={style.importPreviewMeta}>
              <span>{parsed.survey.questions.length}개 질문</span>
              {parsed.survey.settings.isAnonymous && <span>익명</span>}
            </div>
            <div className={style.importQuestionList}>
              {parsed.survey.questions.map((q, i) => (
                <div key={i} className={style.importQuestionItem}>
                  <span className={style.importQuestionNum}>{i + 1}</span>
                  <span className={style.importQuestionTitle}>
                    {q.title || "(제목 없음)"}
                  </span>
                  <span className={style.importQuestionType}>
                    {q.type === "singleChoice"
                      ? "단일 선택"
                      : q.type === "multipleChoice"
                      ? "다중 선택"
                      : q.type === "shortText"
                      ? "단답형"
                      : q.type === "longText"
                      ? "장문형"
                      : q.type === "rating"
                      ? "평점"
                      : q.type === "linearScale"
                      ? "선형 배율"
                      : q.type === "dropdown"
                      ? "드롭다운"
                      : q.type === "date"
                      ? "날짜"
                      : q.type === "fileUpload"
                      ? "파일 업로드"
                      : q.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className={style.importError}>{error}</p>}
      </div>
    </Popup>
  );
};

export default SurveyImportPopup;
