import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TYPE_LABELS,
  TActivity,
  TActivityType,
} from "types/activity";
import style from "style/pages/courses/activity.module.scss";

type Props = {
  activities: TActivity[];
  onSelect: (activity: TActivity) => void;
  showDraft?: boolean;
};

const ActivityList = ({ activities, onSelect, showDraft = true }: Props) => {
  const filtered = showDraft
    ? activities
    : activities.filter((a) => a.status !== "draft");

  if (filtered.length === 0) {
    return (
      <div className={style.empty}>
        {showDraft ? "등록된 활동이 없습니다." : "게시된 활동이 없습니다."}
      </div>
    );
  }

  const typeClass = (type: TActivityType) =>
    ({
      assignment: style.badgeAssignment,
      quiz: style.badgeQuiz,
      discussion: style.badgeDiscussion,
    })[type];

  const statusClass = (status: TActivity["status"]) =>
    ({
      draft: style.badgeDraft,
      published: style.badgePublished,
      closed: style.badgeClosed,
    })[status];

  return (
    <div className={style.cardList}>
      {filtered.map((activity) => (
        <div
          key={activity._id}
          className={style.card}
          onClick={() => onSelect(activity)}
        >
          <div className={style.cardHeader}>
            <div className={style.cardTitle}>{activity.title}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <span className={`${style.badge} ${typeClass(activity.type)}`}>
                {ACTIVITY_TYPE_LABELS[activity.type]}
              </span>
              <span
                className={`${style.badge} ${statusClass(activity.status)}`}
              >
                {ACTIVITY_STATUS_LABELS[activity.status]}
              </span>
            </div>
          </div>
          {activity.dueAt && (
            <div className={style.meta}>
              마감: {new Date(activity.dueAt).toLocaleString("ko-KR")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ActivityList;
