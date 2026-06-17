import { useState } from "react";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TActivityTemplate } from "types/activity";
import style from "style/pages/courses/activity.module.scss";

type Props = {
  template: TActivityTemplate;
  onBack: () => void;
};

const ActivityTemplateEditor = ({ template, onBack }: Props) => {
  const { ActivityTemplateAPI } = useAPIv2();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [content, setContent] = useState(template.preset?.content ?? "");

  return (
    <div>
      <Button type="ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← 목록
      </Button>
      <div className={style.formField}>
        <label className={style.formLabel}>이름</label>
        <input className={style.formInput} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className={style.formField}>
        <label className={style.formLabel}>설명</label>
        <input className={style.formInput} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className={style.formField}>
        <label className={style.formLabel}>기본 안내</label>
        <textarea className={style.formTextarea} value={content} onChange={(e) => setContent(e.target.value)} />
      </div>
      <Button
        type="ghost"
        onClick={() =>
          ActivityTemplateAPI.UActivityTemplate({
            params: { _id: template._id },
            data: { name, description, preset: { ...template.preset, content } },
          })
            .then(() => {
              alert(SUCCESS_MESSAGE);
              onBack();
            })
            .catch(ALERT_ERROR)
        }
      >
        저장
      </Button>
    </div>
  );
};

export default ActivityTemplateEditor;
