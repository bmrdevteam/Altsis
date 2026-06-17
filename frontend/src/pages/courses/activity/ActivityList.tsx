import Button from "components/button/Button";
import {
  ACTIVITY_STATUS_LABEL_MAP,
  ACTIVITY_TYPE_LABEL_MAP,
  TActivity,
} from "types/activity";
import style from "./activity.module.scss";

type Props = {
  activities: TActivity[];
  selectedActivityId?: string;
  onSelect: (activity: TActivity) => void;
  onRefresh: () => void;
  onCreate?: () => void;
};

const getStatusBadgeClassName = (status: TActivity["status"]) => {
  if (status === "published") return style.badgePublished;
  if (status === "closed") return style.badgeClosed;
  return style.badgeDraft;
};

const formatDateTime = (value?: string) => {
  if (!value) return "미설정";
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "미설정";
  return dateValue.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ActivityList = ({
  activities,
  selectedActivityId,
  onSelect,
  onRefresh,
  onCreate,
}: Props) => {
  return (
    <div className={style.panel}>
      <div className={style.panelHeader}>
        <div className={style.panelTitle}>교육활동</div>
        <div className={style.templateActions}>
          {onCreate && (
            <Button type="ghost" onClick={onCreate} style={{ fontSize: "12px" }}>
              활동 생성
            </Button>
          )}
          <Button type="ghost" onClick={onRefresh} style={{ fontSize: "12px" }}>
            새로고침
          </Button>
        </div>
      </div>
      <div className={style.listBody}>
        {activities.length === 0 ? (
          <div className={style.empty}>등록된 활동이 없습니다.</div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity._id}
              className={`${style.activityItem} ${
                selectedActivityId === activity._id ? style.activityItemActive : ""
              }`}
              onClick={() => onSelect(activity)}
            >
              <div className={style.activityTitle}>{activity.title}</div>
              <div className={style.muted}>
                {ACTIVITY_TYPE_LABEL_MAP[activity.type]} · 마감{" "}
                {formatDateTime(activity.dueAt)}
              </div>
              <div className={style.badgeRow}>
                <span className={`${style.badge} ${getStatusBadgeClassName(activity.status)}`}>
                  {ACTIVITY_STATUS_LABEL_MAP[activity.status]}
                </span>
                <span className={style.badge}>
                  {activity.allowResubmit ? "재제출 허용" : "재제출 제한"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityList;
