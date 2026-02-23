import style from "./altBoard.module.scss";
import { TAltForm } from "types/altForm";

type Props = {
  forms: TAltForm[];
  isLoading: boolean;
  canManage: boolean;
  onFormClick: (form: TAltForm) => void;
  onCreateForm: () => void;
};

const AltFormList = ({
  forms,
  isLoading,
  canManage,
  onFormClick,
  onCreateForm,
}: Props) => {
  if (isLoading) return null;

  const getFormStatus = (form: TAltForm) => {
    const now = new Date();
    if (form.settings.closeAt && new Date(form.settings.closeAt) < now) {
      return { label: "마감", className: style.badgeClosed };
    }
    if (form.settings.openAt && new Date(form.settings.openAt) > now) {
      return { label: "예정", className: style.badgeClosed };
    }
    return { label: "진행중", className: style.badgeOpen };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className={style.formList}>
      {canManage && (
        <button className={style.addFormBtn} onClick={onCreateForm}>
          + 새 양식 만들기
        </button>
      )}

      {forms.length === 0 && !canManage && (
        <div className={style.emptyState}>등록된 양식이 없습니다.</div>
      )}

      {forms.map((form) => {
        const status = getFormStatus(form);
        return (
          <div
            key={form._id}
            className={style.formCard}
            onClick={() => onFormClick(form)}
          >
            <div className={style.formCardLeft}>
              <div className={style.formCardTitle}>{form.title}</div>
              <div className={style.formCardMeta}>
                <span
                  className={`${style.formCardBadge} ${status.className}`}
                >
                  {status.label}
                </span>
                <span>{form.fields.length}개 항목</span>
                <span>{formatDate(form.createdAt)}</span>
                {form.settings.closeAt && (
                  <span>
                    마감: {formatDate(form.settings.closeAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AltFormList;
