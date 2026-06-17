import Button from "components/button/Button";
import {
  ACTIVITY_TEMPLATE_SCOPE_LABEL_MAP,
  ACTIVITY_TYPE_LABEL_MAP,
  TActivityTemplate,
} from "types/activity";
import style from "./activity.module.scss";

type Props = {
  templates: TActivityTemplate[];
  selectedTemplateId?: string;
  isLoading?: boolean;
  onSelect: (template: TActivityTemplate) => void;
  onCreateTemplate: () => void;
  onDuplicate: (template: TActivityTemplate) => void;
  onEdit: (template: TActivityTemplate) => void;
  onDelete: (template: TActivityTemplate) => void;
};

const ActivityTemplateList = ({
  templates,
  selectedTemplateId,
  isLoading = false,
  onSelect,
  onCreateTemplate,
  onDuplicate,
  onEdit,
  onDelete,
}: Props) => {
  return (
    <div className={style.panel}>
      <div className={style.panelHeader}>
        <div className={style.panelTitle}>템플릿 갤러리</div>
        <Button
          type="ghost"
          onClick={onCreateTemplate}
          style={{ fontSize: "12px" }}
        >
          템플릿 추가
        </Button>
      </div>

      <div className={style.detailBody}>
        {isLoading ? (
          <div className={style.empty}>템플릿을 불러오는 중입니다.</div>
        ) : templates.length === 0 ? (
          <div className={style.empty}>사용 가능한 템플릿이 없습니다.</div>
        ) : (
          <div className={style.templateGrid}>
            {templates.map((template) => (
              <div
                key={template._id}
                className={`${style.templateCard} ${
                  selectedTemplateId === template._id ? style.templateCardActive : ""
                }`}
                onClick={() => onSelect(template)}
              >
                <div className={style.activityTitle}>{template.name}</div>
                <div className={style.badgeRow}>
                  <span className={style.badge}>
                    {ACTIVITY_TYPE_LABEL_MAP[template.type]}
                  </span>
                  <span className={style.badge}>
                    {ACTIVITY_TEMPLATE_SCOPE_LABEL_MAP[template.scope]}
                  </span>
                </div>
                <div className={style.templateActions}>
                  <Button
                    type="ghost"
                    onClick={(event: any) => {
                      event.stopPropagation();
                      onDuplicate(template);
                    }}
                    style={{ fontSize: "12px" }}
                  >
                    복제
                  </Button>
                  {template.isEditable && (
                    <>
                      <Button
                        type="ghost"
                        onClick={(event: any) => {
                          event.stopPropagation();
                          onEdit(template);
                        }}
                        style={{ fontSize: "12px" }}
                      >
                        수정
                      </Button>
                      <Button
                        type="ghost"
                        onClick={(event: any) => {
                          event.stopPropagation();
                          onDelete(template);
                        }}
                        style={{ fontSize: "12px" }}
                      >
                        삭제
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTemplateList;
