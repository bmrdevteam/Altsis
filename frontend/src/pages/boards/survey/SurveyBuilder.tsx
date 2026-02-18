import { useState } from "react";
import style from "./survey.module.scss";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Select from "components/select/Select";
import Input from "components/input/Input";
import SurveyQuestionEditor from "./SurveyQuestionEditor";
import {
  TSurvey,
  TSurveyQuestion,
  TSurveySettings,
  TSurveyQuestionType,
} from "types/survey";

type Props = {
  survey: TSurvey | null;
  onChange: (survey: TSurvey | null) => void;
  postId?: string;
  hideToggle?: boolean;
};

const DEFAULT_SETTINGS: TSurveySettings = {
  isAnonymous: false,
  showResults: "afterResponse",
  deadline: null,
  allowModify: false,
};

const SurveyBuilder = ({ survey, onChange, postId, hideToggle }: Props) => {
  const isEnabled = !!survey;

  const handleToggle = () => {
    if (isEnabled) {
      onChange(null);
    } else {
      onChange({
        questions: [],
        settings: { ...DEFAULT_SETTINGS },
        responseCount: 0,
      });
    }
  };

  const updateSettings = (partial: Partial<TSurveySettings>) => {
    if (!survey) return;
    onChange({
      ...survey,
      settings: { ...survey.settings, ...partial },
    });
  };

  const addQuestion = () => {
    if (!survey) return;
    const newQ: TSurveyQuestion = {
      id: crypto.randomUUID(),
      type: "singleChoice" as TSurveyQuestionType,
      title: "",
      description: "",
      isRequired: false,
      options: [
        { id: crypto.randomUUID(), text: "옵션 1" },
        { id: crypto.randomUUID(), text: "옵션 2" },
      ],
    };
    onChange({ ...survey, questions: [...survey.questions, newQ] });
  };

  const duplicateQuestion = (idx: number) => {
    if (!survey) return;
    const source = survey.questions[idx];
    const duplicated: TSurveyQuestion = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title} (복사)`,
      options: source.options?.map((o) => ({
        ...o,
        id: crypto.randomUUID(),
      })),
      attachments: source.attachments ? [...source.attachments] : undefined,
    };
    const questions = [...survey.questions];
    questions.splice(idx + 1, 0, duplicated);
    onChange({ ...survey, questions });
  };

  const updateQuestion = (idx: number, updated: TSurveyQuestion) => {
    if (!survey) return;
    const questions = [...survey.questions];
    questions[idx] = updated;
    onChange({ ...survey, questions });
  };

  const removeQuestion = (idx: number) => {
    if (!survey) return;
    onChange({
      ...survey,
      questions: survey.questions.filter((_, i) => i !== idx),
    });
  };

  const moveQuestion = (from: number, to: number) => {
    if (!survey) return;
    if (to < 0 || to >= survey.questions.length) return;
    const questions = [...survey.questions];
    const [moved] = questions.splice(from, 1);
    questions.splice(to, 0, moved);
    onChange({ ...survey, questions });
  };

  return (
    <div>
      {!hideToggle && (
        <div className={style.surveyToggle}>
          <ToggleSwitch checked={isEnabled} onChange={handleToggle} />
          <span className={style.surveyToggleLabel}>설문 추가</span>
        </div>
      )}

      {isEnabled && survey && (
        <div className={style.builderContainer}>
          {/* 설문 제목 / 설명 */}
          <div className={style.surveyTitleSection}>
            <Input
              placeholder="설문 제목 (선택사항)"
              value={survey.title || ""}
              onChange={(e: any) =>
                onChange({ ...survey, title: e.target.value })
              }
            />
            <Input
              placeholder="설문 설명 (선택사항)"
              value={survey.description || ""}
              onChange={(e: any) =>
                onChange({ ...survey, description: e.target.value })
              }
            />
          </div>

          {/* 설정 패널 */}
          <div className={style.settingsPanel}>
            <div className={style.settingsItem}>
              <span className={style.settingsLabel}>익명 응답</span>
              <div className={style.settingsToggle}>
                <ToggleSwitch
                  checked={survey.settings.isAnonymous}
                  onChange={(checked: boolean) =>
                    updateSettings({ isAnonymous: checked })
                  }
                />
                <span className={style.settingsToggleText}>
                  {survey.settings.isAnonymous ? "익명" : "실명"}
                </span>
              </div>
            </div>

            <div className={style.settingsItem}>
              <span className={style.settingsLabel}>결과 공개</span>
              <Select
                options={[
                  { text: "응답 후 공개", value: "afterResponse" },
                  { text: "작성자만", value: "creator" },
                ]}
                defaultSelectedValue={survey.settings.showResults}
                appearence="flat"
                onChange={(value: string) =>
                  updateSettings({
                    showResults: value as "creator" | "afterResponse",
                  })
                }
              />
            </div>

            <div className={style.settingsItem}>
              <span className={style.settingsLabel}>마감일</span>
              <input
                type="datetime-local"
                className={style.settingsDateInput}
                value={
                  survey.settings.deadline
                    ? new Date(survey.settings.deadline)
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  updateSettings({
                    deadline: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </div>

            <div className={style.settingsItem}>
              <span className={style.settingsLabel}>응답 수정 허용</span>
              <div className={style.settingsToggle}>
                <ToggleSwitch
                  checked={survey.settings.allowModify}
                  onChange={(checked: boolean) =>
                    updateSettings({ allowModify: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* 질문 목록 */}
          <div className={style.questionList}>
            {survey.questions.map((q, idx) => (
              <SurveyQuestionEditor
                key={q.id}
                index={idx}
                question={q}
                onChange={(updated) => updateQuestion(idx, updated)}
                onRemove={() => removeQuestion(idx)}
                onDuplicate={() => duplicateQuestion(idx)}
                onMoveUp={idx > 0 ? () => moveQuestion(idx, idx - 1) : undefined}
                onMoveDown={
                  idx < survey.questions.length - 1
                    ? () => moveQuestion(idx, idx + 1)
                    : undefined
                }
                postId={postId}
              />
            ))}
          </div>

          {/* 질문 추가 버튼 */}
          <div className={style.addQuestionBtn} onClick={addQuestion}>
            + 질문 추가
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyBuilder;
