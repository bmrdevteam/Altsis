import { useEffect, useState } from "react";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TActivityTemplate } from "types/activity";
import style from "style/pages/courses/activity.module.scss";

type Props = {
  syllabusId: string;
  setPopupActive: (v: boolean) => void;
  onCreated: () => void;
};

const ActivityCreatePopup = ({
  syllabusId,
  setPopupActive,
  onCreated,
}: Props) => {
  const { ActivityTemplateAPI } = useAPIv2();
  const [templates, setTemplates] = useState<TActivityTemplate[]>([]);
  const [selected, setSelected] = useState<TActivityTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ActivityTemplateAPI.RActivityTemplates()
      .then(({ templates: list }) =>
        setTemplates(list.filter((t) => t.scope === "builtin"))
      )
      .catch(ALERT_ERROR)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = () => {
    if (!selected || !title.trim()) {
      alert("템플릿과 제목을 입력해 주세요.");
      return;
    }
    ActivityTemplateAPI.CActivityTemplateInstantiate({
      params: { _id: selected._id },
      data: { syllabus: syllabusId, title: title.trim(), dueAt: dueAt || undefined },
    })
      .then(() => {
        alert(SUCCESS_MESSAGE);
        onCreated();
        setPopupActive(false);
      })
      .catch(ALERT_ERROR);
  };

  return (
    <Popup setState={setPopupActive} title="활동 만들기" closeBtn>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className={style.templateGrid}>
            {templates.map((template) => (
              <div
                key={template._id}
                className={`${style.templateCard} ${
                  selected?._id === template._id ? style.templateCardSelected : ""
                }`}
                onClick={() => {
                  setSelected(template);
                  if (!title) setTitle(template.name);
                }}
              >
                <strong>{template.name}</strong>
                <div className={style.meta}>{template.description}</div>
              </div>
            ))}
          </div>
          <div className={style.formField}>
            <label className={style.formLabel}>제목</label>
            <input
              className={style.formInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className={style.formField}>
            <label className={style.formLabel}>마감일</label>
            <input
              className={style.formInput}
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
          <Button type="ghost" onClick={handleCreate}>
            활동 생성
          </Button>
        </>
      )}
    </Popup>
  );
};

export default ActivityCreatePopup;
