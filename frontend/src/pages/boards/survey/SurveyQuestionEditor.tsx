import { useRef, useState } from "react";
import style from "./survey.module.scss";
import Input from "components/input/Input";
import Select from "components/select/Select";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import {
  TSurveyQuestion,
  TSurveyQuestionType,
  TSurveyOption,
  TSurveyFileInfo,
} from "types/survey";

const QUESTION_TYPE_OPTIONS: { text: string; value: TSurveyQuestionType }[] = [
  { text: "단일 선택", value: "singleChoice" },
  { text: "복수 선택", value: "multipleChoice" },
  { text: "단답형", value: "shortText" },
  { text: "장문형", value: "longText" },
  { text: "평점", value: "rating" },
  { text: "선형 배율", value: "linearScale" },
  { text: "드롭다운", value: "dropdown" },
  { text: "날짜", value: "date" },
  { text: "파일 업로드", value: "fileUpload" },
];

type Props = {
  index: number;
  question: TSurveyQuestion;
  onChange: (updated: TSurveyQuestion) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  postId?: string;
};

const SurveyQuestionEditor = ({
  index,
  question,
  onChange,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  postId,
}: Props) => {
  const { SurveyResponseAPI } = useAPIv2();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showAttachments, setShowAttachments] = useState(
    () => (question.attachments?.length || 0) > 0
  );

  const update = (partial: Partial<TSurveyQuestion>) => {
    onChange({ ...question, ...partial });
  };

  const addOption = () => {
    const newOpt: TSurveyOption = {
      id: crypto.randomUUID(),
      text: `옵션 ${(question.options?.length || 0) + 1}`,
    };
    update({ options: [...(question.options || []), newOpt] });
  };

  const updateOption = (optId: string, text: string) => {
    update({
      options: (question.options || []).map((o) =>
        o.id === optId ? { ...o, text } : o
      ),
    });
  };

  const removeOption = (optId: string) => {
    update({
      options: (question.options || []).filter((o) => o.id !== optId),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const fileInfo = await SurveyResponseAPI.CSurveyFileUpload({
        query: { post: postId || "temp" },
        data: formData,
      });

      update({
        attachments: [...(question.attachments || []), fileInfo],
      });
    } catch (err) {
      ALERT_ERROR(err);
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAttachment = (key: string) => {
    update({
      attachments: (question.attachments || []).filter((a) => a.key !== key),
    });
  };

  const hasOptions =
    question.type === "singleChoice" ||
    question.type === "multipleChoice" ||
    question.type === "dropdown";

  return (
    <div className={style.questionCard}>
      <div className={style.questionHeader}>
        <span className={style.questionNumber}>Q{index + 1}</span>
        <div className={style.questionTypeSelect}>
          <Select
            options={QUESTION_TYPE_OPTIONS}
            defaultSelectedValue={question.type}
            appearence="flat"
            onChange={(value: string) => {
              const newType = value as TSurveyQuestionType;
              const needsOptions =
                newType === "singleChoice" ||
                newType === "multipleChoice" ||
                newType === "dropdown";
              update({
                type: newType,
                options: needsOptions
                  ? question.options?.length
                    ? question.options
                    : [
                        { id: crypto.randomUUID(), text: "옵션 1" },
                        { id: crypto.randomUUID(), text: "옵션 2" },
                      ]
                  : [],
              });
            }}
          />
        </div>
        <div className={style.questionActions}>
          {onMoveUp && (
            <button
              type="button"
              className={style.moveBtn}
              onClick={onMoveUp}
              title="위로 이동"
              aria-label="질문 위로 이동"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              className={style.moveBtn}
              onClick={onMoveDown}
              title="아래로 이동"
              aria-label="질문 아래로 이동"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            className={style.duplicateBtn}
            onClick={onDuplicate}
            title="복제"
            aria-label="질문 복제"
          >
            ⧉
          </button>
          <button
            type="button"
            className={style.removeBtn}
            onClick={onRemove}
            title="삭제"
            aria-label="질문 삭제"
          >
            ×
          </button>
        </div>
      </div>

      <div className={style.questionBody}>
        <Input
          placeholder="질문을 입력하세요"
          value={question.title}
          onChange={(e: any) => update({ title: e.target.value })}
        />
        <Input
          placeholder="설명 (선택사항)"
          value={question.description || ""}
          onChange={(e: any) => update({ description: e.target.value })}
        />

        {/* 선택지 편집 */}
        {hasOptions && (
          <div>
            {(question.options || []).map((opt) => (
              <div key={opt.id} className={style.optionRow}>
                <div className={style.optionInput}>
                  <Input
                    value={opt.text}
                    onChange={(e: any) => updateOption(opt.id, e.target.value)}
                    placeholder="옵션 텍스트"
                  />
                </div>
                <button
                  type="button"
                  className={style.removeBtn}
                  onClick={() => removeOption(opt.id)}
                  aria-label={`옵션 "${opt.text}" 삭제`}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className={style.addOptionBtn}
              onClick={addOption}
            >
              + 옵션 추가
            </button>
          </div>
        )}

        {/* 선형 배율 설정 */}
        {question.type === "linearScale" && (
          <div className={style.scaleRow}>
            <div className={style.scaleField}>
              <span>최솟값</span>
              <input
                type="number"
                value={question.scaleMin ?? 1}
                onChange={(e) => update({ scaleMin: Number(e.target.value) })}
              />
            </div>
            <div className={style.scaleField}>
              <span>최댓값</span>
              <input
                type="number"
                value={question.scaleMax ?? 5}
                onChange={(e) => update({ scaleMax: Number(e.target.value) })}
              />
            </div>
            <Input
              placeholder="최솟값 라벨 (예: 매우 불만족)"
              value={question.scaleMinLabel || ""}
              onChange={(e: any) => update({ scaleMinLabel: e.target.value })}
            />
            <Input
              placeholder="최댓값 라벨 (예: 매우 만족)"
              value={question.scaleMaxLabel || ""}
              onChange={(e: any) => update({ scaleMaxLabel: e.target.value })}
            />
          </div>
        )}

        {/* 파일 업로드 설정 */}
        {question.type === "fileUpload" && (
          <div className={style.scaleRow}>
            <div className={style.scaleField}>
              <span>최대 파일 수</span>
              <input
                type="number"
                value={question.maxFiles ?? 1}
                min={1}
                max={10}
                onChange={(e) => update({ maxFiles: Number(e.target.value) })}
              />
            </div>
            <div className={style.scaleField}>
              <span>최대 크기 (MB)</span>
              <input
                type="number"
                value={Math.round((question.maxFileSize ?? 10485760) / 1048576)}
                min={1}
                max={20}
                onChange={(e) =>
                  update({ maxFileSize: Number(e.target.value) * 1048576 })
                }
              />
            </div>
          </div>
        )}

        {/* 질문 첨부파일 (접힌 상태 기본) */}
        {!showAttachments ? (
          <button
            type="button"
            className={style.attachmentToggle}
            onClick={() => setShowAttachments(true)}
          >
            + 참고 파일 첨부
          </button>
        ) : (
          <div className={style.attachmentArea}>
            {(question.attachments || []).length > 0 && (
              <div className={style.attachmentList}>
                {(question.attachments || []).map((att) => (
                  <div key={att.key} className={style.attachmentItem}>
                    <span>{att.fileName}</span>
                    <button
                      type="button"
                      className={style.removeBtn}
                      onClick={() => removeAttachment(att.key)}
                      aria-label={`첨부파일 "${att.fileName}" 삭제`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              className={style.fileInput}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              className={style.addOptionBtn}
              onClick={() => fileRef.current?.click()}
            >
              + 참고 파일 첨부
            </button>
          </div>
        )}

        {/* 필수 여부 토글 */}
        <label className={style.requiredToggle}>
          <input
            type="checkbox"
            checked={question.isRequired || false}
            onChange={(e) => update({ isRequired: e.target.checked })}
          />
          필수 응답
        </label>
      </div>
    </div>
  );
};

export default SurveyQuestionEditor;
