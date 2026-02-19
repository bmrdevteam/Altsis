import { useRef, useState } from "react";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import {
  TReservationConfig,
  TReservationExportData,
} from "types/reservation";
import style from "../survey/survey.module.scss";

type Props = {
  setState: (state: boolean) => void;
  onImport: (config: TReservationConfig) => void;
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const ReservationImportPopup = ({ setState, onImport }: Props) => {
  const [parsed, setParsed] = useState<TReservationExportData | null>(null);
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
        if (
          !data.version ||
          data.type !== "reservation" ||
          !data.config?.resource
        ) {
          setError("유효한 예약 내보내기 파일이 아닙니다.");
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

    const config: TReservationConfig = {
      resource: parsed.config.resource,
      resourceDescription: parsed.config.resourceDescription || "",
      slotMode: parsed.config.slotMode || "time",
      defaultCapacity: parsed.config.defaultCapacity || 1,
      requireApproval: parsed.config.requireApproval ?? true,
      maxReservationsPerUser: parsed.config.maxReservationsPerUser || 0,
      reservationOpenAt: "",
      reservationCloseAt: "",
      applicationForm: parsed.config.applicationForm || [],
      ...(parsed.slotRuleTemplate && {
        slotRuleTemplate: {
          days: parsed.slotRuleTemplate.days || [1, 2, 3, 4, 5],
          ...(parsed.slotRuleTemplate.timeSlots && {
            timeSlots: parsed.slotRuleTemplate.timeSlots,
          }),
          ...(parsed.slotRuleTemplate.labels && {
            labels: parsed.slotRuleTemplate.labels,
          }),
          capacity: parsed.slotRuleTemplate.capacity || 1,
        },
      }),
    };

    onImport(config);
    setState(false);
  };

  return (
    <Popup
      setState={setState}
      title="예약 템플릿 가져오기"
      closeBtn
      style={{ maxWidth: "520px", width: "100%" }}
      footer={
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}
        >
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
              예약 내보내기로 생성된 .json 파일
            </span>
          </div>
        ) : (
          <div className={style.importPreview}>
            <div className={style.importPreviewHeader}>
              <span className={style.importPreviewTitle}>
                {parsed.config.resource}
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
            {parsed.config.resourceDescription && (
              <p className={style.importPreviewDesc}>
                {parsed.config.resourceDescription}
              </p>
            )}
            <div className={style.importPreviewMeta}>
              <span>
                {parsed.config.slotMode === "time" ? "시간 모드" : "라벨 모드"}
              </span>
              <span>정원 {parsed.config.defaultCapacity}명</span>
              <span>
                {parsed.config.requireApproval ? "승인 필요" : "즉시 확정"}
              </span>
            </div>

            {parsed.slotRuleTemplate && (
              <div className={style.importQuestionList}>
                <div className={style.importQuestionItem}>
                  <span className={style.importQuestionNum}>요일</span>
                  <span className={style.importQuestionTitle}>
                    {parsed.slotRuleTemplate.days
                      .map((d) => DAY_LABELS[d])
                      .join(", ")}
                  </span>
                </div>
                {parsed.slotRuleTemplate.timeSlots && (
                  <div className={style.importQuestionItem}>
                    <span className={style.importQuestionNum}>시간</span>
                    <span className={style.importQuestionTitle}>
                      {parsed.slotRuleTemplate.timeSlots
                        .map((t) => `${t.startTime}~${t.endTime}`)
                        .join(", ")}
                    </span>
                  </div>
                )}
                {parsed.slotRuleTemplate.labels && (
                  <div className={style.importQuestionItem}>
                    <span className={style.importQuestionNum}>라벨</span>
                    <span className={style.importQuestionTitle}>
                      {parsed.slotRuleTemplate.labels.join(", ")}
                    </span>
                  </div>
                )}
                <div className={style.importQuestionItem}>
                  <span className={style.importQuestionNum}>정원</span>
                  <span className={style.importQuestionTitle}>
                    {parsed.slotRuleTemplate.capacity}명
                  </span>
                </div>
              </div>
            )}

            {parsed.config.applicationForm &&
              parsed.config.applicationForm.length > 0 && (
                <div className={style.importPreviewMeta}>
                  <span>
                    신청 양식 {parsed.config.applicationForm.length}개 필드
                  </span>
                </div>
              )}
          </div>
        )}

        {error && <p className={style.importError}>{error}</p>}
      </div>
    </Popup>
  );
};

export default ReservationImportPopup;
