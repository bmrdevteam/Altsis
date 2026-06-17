import { useEffect, useMemo, useState } from "react";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import {
  TActivityTemplate,
  TActivityTemplatePreset,
  TActivityTemplateScope,
  TActivityType,
  buildDefaultActivityTemplatePreset,
} from "types/activity";
import { TAltFormField } from "types/altForm";
import style from "./activity.module.scss";

type Props = {
  syllabusId: string;
  template?: TActivityTemplate | null;
  onClose: () => void;
  onSaved: (template: TActivityTemplate) => void;
};

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const defaultRespondentLabel = (type: TActivityType) => {
  if (type === "quiz") return "답안";
  if (type === "discussion") return "토론 의견";
  return "과제 제출 내용";
};

const buildRespondentField = (
  type: TActivityType,
  label: string,
  order: number
): TAltFormField => ({
  _id: `${type}_respondent`,
  label,
  type: "textarea",
  permission: "respondent",
  visibleToRespondent: true,
  required: true,
  options: [],
  order,
});

const buildFeedbackField = (order: number): TAltFormField => ({
  _id: "activity_feedback",
  label: "교사 피드백",
  type: "textarea",
  permission: "owner",
  visibleToRespondent: true,
  required: false,
  options: [],
  order,
});

const resolveRespondentLabel = (
  preset: TActivityTemplatePreset | undefined,
  type: TActivityType
) => {
  const label = preset?.altFormSchema?.fields?.find(
    (field) => field.permission === "respondent"
  )?.label;
  return label || defaultRespondentLabel(type);
};

const ActivityTemplateEditor = ({
  syllabusId,
  template = null,
  onClose,
  onSaved,
}: Props) => {
  const { ActivityTemplateAPI } = useAPIv2();

  const [name, setName] = useState("");
  const [type, setType] = useState<TActivityType>("assignment");
  const [scope, setScope] = useState<Exclude<TActivityTemplateScope, "builtin">>(
    "personal"
  );
  const [content, setContent] = useState("");
  const [respondentLabel, setRespondentLabel] = useState("");
  const [allowResubmit, setAllowResubmit] = useState(true);
  const [shareResponses, setShareResponses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const basePreset = useMemo(() => {
    if (template?.preset) return deepClone(template.preset);
    return buildDefaultActivityTemplatePreset(type);
  }, [template, type]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setScope(template.scope === "school" ? "school" : "personal");
      setContent(template.preset?.content || "");
      setRespondentLabel(resolveRespondentLabel(template.preset, template.type));
      setAllowResubmit(
        template.preset?.altFormSchema?.settings?.allowResubmit !== false
      );
      setShareResponses(!!template.preset?.altFormSchema?.settings?.shareResponses);
      return;
    }
    setName("");
    setType("assignment");
    setScope("personal");
    const preset = buildDefaultActivityTemplatePreset("assignment");
    setContent(preset.content);
    setRespondentLabel(resolveRespondentLabel(preset, "assignment"));
    setAllowResubmit(preset.altFormSchema.settings.allowResubmit !== false);
    setShareResponses(!!preset.altFormSchema.settings.shareResponses);
  }, [template]);

  useEffect(() => {
    if (!template) {
      const preset = buildDefaultActivityTemplatePreset(type);
      setContent(preset.content);
      setRespondentLabel(resolveRespondentLabel(preset, type));
      setAllowResubmit(preset.altFormSchema.settings.allowResubmit !== false);
      setShareResponses(!!preset.altFormSchema.settings.shareResponses);
    }
  }, [type, template]);

  const buildPreset = (): TActivityTemplatePreset => {
    const preset = deepClone(basePreset || buildDefaultActivityTemplatePreset(type));
    const fields: TAltFormField[] = Array.isArray(preset.altFormSchema?.fields)
      ? preset.altFormSchema.fields.map((field, index): TAltFormField => ({
          ...field,
          _id: field._id || `${type}_${index}`,
          label: field.label || "항목",
          type: field.type || "text",
          permission: field.permission || "respondent",
          visibleToRespondent:
            field.permission === "respondent" ? true : !!field.visibleToRespondent,
          required:
            field.permission === "respondent" ? !!field.required : !!field.required,
          options: Array.isArray(field.options) ? field.options : [],
          order: index,
        }))
      : [];

    const respondentIndex = fields.findIndex(
      (field) => field.permission === "respondent"
    );

    if (respondentIndex === -1) {
      fields.unshift(buildRespondentField(type, respondentLabel, 0));
    } else {
      fields[respondentIndex] = {
        ...fields[respondentIndex],
        label: respondentLabel || defaultRespondentLabel(type),
        permission: "respondent",
        visibleToRespondent: true,
        options: Array.isArray(fields[respondentIndex].options)
          ? fields[respondentIndex].options
          : [],
      };
    }

    const feedbackIndex = fields.findIndex(
      (field) => field.permission === "owner" && field.visibleToRespondent
    );
    if (feedbackIndex === -1) {
      fields.push(buildFeedbackField(fields.length));
    } else {
      fields[feedbackIndex] = {
        ...fields[feedbackIndex],
        permission: "owner",
        visibleToRespondent: true,
        options: Array.isArray(fields[feedbackIndex].options)
          ? fields[feedbackIndex].options
          : [],
      };
    }

    const normalizedFields: TAltFormField[] = fields.map((field, index) => ({
      ...field,
      order: index,
    }));

    return {
      content,
      attachments: Array.isArray(preset.attachments) ? preset.attachments : [],
      altFormSchema: {
        fields: normalizedFields,
        settings: {
          ...(preset.altFormSchema?.settings || {}),
          allowResubmit,
          showOwnResponse: true,
          showOwnerFields: false,
          shareResponses,
        },
      },
      rubric: Array.isArray(preset.rubric) ? preset.rubric : [],
    };
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("템플릿 이름을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const preset = buildPreset();
      if (template?._id) {
        const { template: savedTemplate } = await ActivityTemplateAPI.UActivityTemplate(
          {
            params: { _id: template._id },
            data: {
              name: name.trim(),
              type,
              preset,
            },
          }
        );
        onSaved(savedTemplate);
      } else {
        const { template: savedTemplate } = await ActivityTemplateAPI.CActivityTemplate(
          {
            data: {
              syllabus: syllabusId,
              scope,
              name: name.trim(),
              type,
              preset,
            },
          }
        );
        onSaved(savedTemplate);
      }
      onClose();
    } catch (error) {
      ALERT_ERROR(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popup
      title={template ? "템플릿 수정" : "템플릿 추가"}
      setState={onClose}
      closeBtn
      style={{ maxWidth: "720px", width: "100%" }}
      footer={
        <>
          <Button type="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="ghost" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "저장 중..." : "저장"}
          </Button>
        </>
      }
    >
      <div className={style.detailBody}>
        <div className={style.formRow}>
          <label className={style.label}>템플릿 이름</label>
          <input
            className={style.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 1주차 과제 템플릿"
          />
        </div>

        <div className={style.inlineRow}>
          <div className={style.formRow} style={{ flex: 1 }}>
            <label className={style.label}>활동 유형</label>
            <select
              className={style.select}
              value={type}
              onChange={(event) => setType(event.target.value as TActivityType)}
            >
              <option value="assignment">과제</option>
              <option value="quiz">퀴즈</option>
              <option value="discussion">토론</option>
            </select>
          </div>

          {!template && (
            <div className={style.formRow} style={{ flex: 1 }}>
              <label className={style.label}>공개 범위</label>
              <select
                className={style.select}
                value={scope}
                onChange={(event) =>
                  setScope(
                    event.target.value as Exclude<TActivityTemplateScope, "builtin">
                  )
                }
              >
                <option value="personal">개인</option>
                <option value="school">학교</option>
              </select>
            </div>
          )}
        </div>

        <div className={style.formRow}>
          <label className={style.label}>학생 응답 항목 이름</label>
          <input
            className={style.input}
            value={respondentLabel}
            onChange={(event) => setRespondentLabel(event.target.value)}
            placeholder={defaultRespondentLabel(type)}
          />
        </div>

        <div className={style.formRow}>
          <label className={style.label}>활동 안내</label>
          <textarea
            className={style.textarea}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="활동 안내 문구를 입력하세요."
          />
        </div>

        <div className={style.inlineRow}>
          <label className={style.muted}>
            <input
              type="checkbox"
              checked={allowResubmit}
              onChange={(event) => setAllowResubmit(event.target.checked)}
              style={{ marginRight: "6px" }}
            />
            재제출 허용
          </label>
          <label className={style.muted}>
            <input
              type="checkbox"
              checked={shareResponses}
              onChange={(event) => setShareResponses(event.target.checked)}
              style={{ marginRight: "6px" }}
            />
            응답 공유
          </label>
        </div>
      </div>
    </Popup>
  );
};

export default ActivityTemplateEditor;
