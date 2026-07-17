import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import {
  TActivity,
  TActivityStatus,
  TActivityTemplate,
  TActivityType,
} from "types/activity";
import ActivityTemplateEditor from "./ActivityTemplateEditor";
import ActivityTemplateList from "./ActivityTemplateList";
import style from "./activity.module.scss";

type Props = {
  syllabusId: string;
  onClose: () => void;
  onCreated: (activity: TActivity) => void;
};

const toIsoString = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const ActivityCreatePopup = ({ syllabusId, onClose, onCreated }: Props) => {
  const { ActivityTemplateAPI } = useAPIv2();

  const [templates, setTemplates] = useState<TActivityTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<TActivityType>("assignment");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<TActivityStatus>("draft");
  const [openAt, setOpenAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);
  const [allowResubmit, setAllowResubmit] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TActivityTemplate | null>(
    null
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template._id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const loadTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const { templates: loadedTemplates } = await ActivityTemplateAPI.RActivityTemplates(
        {
          query: { syllabus: syllabusId },
        }
      );
      setTemplates(loadedTemplates);
      if (loadedTemplates.length > 0) {
        setSelectedTemplateId((prev) =>
          prev && loadedTemplates.some((template) => template._id === prev)
            ? prev
            : loadedTemplates[0]._id
        );
      } else {
        setSelectedTemplateId("");
      }
    } catch (error) {
      ALERT_ERROR(error);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [ActivityTemplateAPI, syllabusId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!selectedTemplate) return;
    // Keep the draft title aligned with the selected template by default.
    setTitle(selectedTemplate.name);
    setType(selectedTemplate.type);
    setContent(selectedTemplate.preset?.content || "");
    setAllowResubmit(
      selectedTemplate.preset?.altFormSchema?.settings?.allowResubmit !== false
    );
  }, [selectedTemplate]);

  const handleDuplicateTemplate = async (template: TActivityTemplate) => {
    try {
      const { template: duplicatedTemplate } =
        await ActivityTemplateAPI.CActivityTemplateDuplicate({
          params: { _id: template._id },
          data: { syllabus: syllabusId },
        });
      await loadTemplates();
      setSelectedTemplateId(duplicatedTemplate._id);
      alert("템플릿을 복제했습니다.");
    } catch (error) {
      ALERT_ERROR(error);
    }
  };

  const handleDeleteTemplate = async (template: TActivityTemplate) => {
    if (!window.confirm(`"${template.name}" 템플릿을 삭제하시겠습니까?`)) return;
    try {
      await ActivityTemplateAPI.DActivityTemplate({
        params: { _id: template._id },
      });
      await loadTemplates();
      alert("템플릿을 삭제했습니다.");
    } catch (error) {
      ALERT_ERROR(error);
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedTemplate) {
      alert("템플릿을 선택해주세요.");
      return;
    }
    if (!title.trim()) {
      alert("활동 제목을 입력해주세요.");
      return;
    }

    setIsCreating(true);
    try {
      const resolvedType = selectedTemplate.type;
      const { activity } = await ActivityTemplateAPI.CActivityFromTemplate({
        params: { _id: selectedTemplate._id },
        data: {
          syllabus: syllabusId,
          title: title.trim(),
          type: resolvedType,
          content,
          status,
          openAt: toIsoString(openAt),
          dueAt: toIsoString(dueAt),
          allowLateSubmission,
          allowResubmit,
        },
      });
      onCreated(activity);
      alert("교육활동을 생성했습니다.");
      onClose();
    } catch (error) {
      ALERT_ERROR(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Popup
        title="교육활동 생성"
        setState={onClose}
        closeBtn
        contentScroll
        style={{ maxWidth: "1080px", width: "100%" }}
        footer={
          <>
            <Button type="ghost" onClick={onClose}>
              닫기
            </Button>
            <Button type="ghost" onClick={handleCreateActivity} disabled={isCreating}>
              {isCreating ? "생성 중..." : "활동 생성"}
            </Button>
          </>
        }
      >
        <div className={style.split}>
          <ActivityTemplateList
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            isLoading={isLoadingTemplates}
            onSelect={(template) => setSelectedTemplateId(template._id)}
            onCreateTemplate={() => {
              setEditingTemplate(null);
              setIsTemplateEditorOpen(true);
            }}
            onDuplicate={handleDuplicateTemplate}
            onEdit={(template) => {
              setEditingTemplate(template);
              setIsTemplateEditorOpen(true);
            }}
            onDelete={handleDeleteTemplate}
          />

          <div className={style.panel}>
            <div className={style.panelHeader}>
              <div className={style.panelTitle}>활동 정보</div>
              <Button
                type="ghost"
                onClick={loadTemplates}
                style={{ fontSize: "12px" }}
              >
                템플릿 새로고침
              </Button>
            </div>
            <div className={style.detailBody}>
              <div className={style.formRow}>
                <label className={style.label}>선택 템플릿</label>
                <div className={style.contentBox} style={{ fontSize: "13px" }}>
                  {selectedTemplate
                    ? `${selectedTemplate.name} (${selectedTemplate.type})`
                    : "템플릿을 선택하세요."}
                </div>
              </div>

              <div className={style.formRow}>
                <label className={style.label}>활동 제목</label>
                <input
                  className={style.input}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 1주차 글쓰기 과제"
                />
              </div>

              <div className={style.inlineRow}>
                <div className={style.formRow} style={{ flex: 1 }}>
                  <label className={style.label}>유형</label>
                  <select
                    className={style.select}
                    value={type}
                    onChange={(event) => setType(event.target.value as TActivityType)}
                    disabled
                  >
                    <option value="assignment">과제</option>
                    <option value="quiz">퀴즈</option>
                    <option value="discussion">토론</option>
                  </select>
                </div>

                <div className={style.formRow} style={{ flex: 1 }}>
                  <label className={style.label}>상태</label>
                  <select
                    className={style.select}
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as TActivityStatus)
                    }
                  >
                    <option value="draft">초안</option>
                    <option value="published">게시</option>
                    <option value="closed">마감</option>
                  </select>
                  {status === "draft" && (
                    <p className={style.hint}>
                      초안 상태는 학생에게 보이지 않습니다. 게시 후 학생이 제출할 수
                      있습니다.
                    </p>
                  )}
                </div>
              </div>

              <div className={style.inlineRow}>
                <div className={style.formRow} style={{ flex: 1 }}>
                  <label className={style.label}>시작 일시</label>
                  <input
                    className={style.input}
                    type="datetime-local"
                    value={openAt}
                    onChange={(event) => setOpenAt(event.target.value)}
                  />
                </div>
                <div className={style.formRow} style={{ flex: 1 }}>
                  <label className={style.label}>마감 일시</label>
                  <input
                    className={style.input}
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                  />
                </div>
              </div>

              <div className={style.inlineRow}>
                <label className={style.muted}>
                  <input
                    type="checkbox"
                    checked={allowLateSubmission}
                    onChange={(event) => setAllowLateSubmission(event.target.checked)}
                    style={{ marginRight: "6px" }}
                  />
                  지각 제출 허용
                </label>
                <label className={style.muted}>
                  <input
                    type="checkbox"
                    checked={allowResubmit}
                    onChange={(event) => setAllowResubmit(event.target.checked)}
                    style={{ marginRight: "6px" }}
                  />
                  재제출 허용
                </label>
              </div>

              <div className={style.formRow}>
                <label className={style.label}>활동 안내</label>
                <textarea
                  className={style.textarea}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="활동 안내를 입력하세요."
                />
              </div>
            </div>
          </div>
        </div>
      </Popup>

      {isTemplateEditorOpen && (
        <ActivityTemplateEditor
          syllabusId={syllabusId}
          template={editingTemplate}
          onClose={() => {
            setIsTemplateEditorOpen(false);
            setEditingTemplate(null);
          }}
          onSaved={(savedTemplate) => {
            setIsTemplateEditorOpen(false);
            setEditingTemplate(null);
            setSelectedTemplateId(savedTemplate._id);
            loadTemplates();
          }}
        />
      )}
    </>
  );
};

export default ActivityCreatePopup;
