import { useEffect, useState } from "react";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { ACTIVITY_TYPE_LABELS, TActivityTemplate } from "types/activity";
import style from "style/pages/courses/activity.module.scss";
import ActivityTemplateEditor from "./ActivityTemplateEditor";

type Props = {
  onSelect?: (template: TActivityTemplate) => void;
};

const ActivityTemplateList = ({ onSelect }: Props) => {
  const { ActivityTemplateAPI } = useAPIv2();
  const [templates, setTemplates] = useState<TActivityTemplate[]>([]);
  const [editing, setEditing] = useState<TActivityTemplate | null>(null);

  const load = () => {
    ActivityTemplateAPI.RActivityTemplates()
      .then(({ templates: list }) => setTemplates(list))
      .catch(ALERT_ERROR);
  };

  useEffect(() => {
    load();
  }, []);

  if (editing) {
    return (
      <ActivityTemplateEditor template={editing} onBack={() => { setEditing(null); load(); }} />
    );
  }

  return (
    <div className={style.cardList}>
      {templates.map((template) => (
        <div key={template._id} className={style.card}>
          <div className={style.cardHeader}>
            <div>
              <div className={style.cardTitle}>{template.name}</div>
              <div className={style.meta}>
                {ACTIVITY_TYPE_LABELS[template.type]} · {template.scope}
              </div>
            </div>
            <div className={style.actions}>
              {onSelect && (
                <Button type="ghost" onClick={() => onSelect(template)}>
                  선택
                </Button>
              )}
              <Button
                type="ghost"
                onClick={() =>
                  ActivityTemplateAPI.CActivityTemplateDuplicate({
                    params: { _id: template._id },
                    data: { scope: "personal" },
                  })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      load();
                    })
                    .catch(ALERT_ERROR)
                }
              >
                복제
              </Button>
              {template.isEditable && (
                <Button type="ghost" onClick={() => setEditing(template)}>
                  수정
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTemplateList;
