import { useEffect, useState } from "react";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TActivity } from "types/activity";
import style from "style/pages/courses/activity.module.scss";
import ActivityList from "../../activity/ActivityList";
import ActivityCreatePopup from "../../activity/ActivityCreatePopup";
import ActivityDetail from "../../activity/ActivityDetail";
import ActivityTemplateList from "../../activity/ActivityTemplateList";

type Props = {
  syllabusId: string;
  canManage?: boolean;
};

const ActivityTab = ({ syllabusId, canManage = true }: Props) => {
  const { ActivityAPI } = useAPIv2();
  const [activities, setActivities] = useState<TActivity[]>([]);
  const [createPopup, setCreatePopup] = useState(false);
  const [selected, setSelected] = useState<TActivity | null>(null);
  const [view, setView] = useState<"list" | "templates">("list");

  const load = () => {
    ActivityAPI.RActivities({ query: { syllabus: syllabusId } })
      .then(({ activities: list }) => setActivities(list))
      .catch(ALERT_ERROR);
  };

  useEffect(() => {
    load();
  }, [syllabusId]);

  if (selected) {
    return (
      <ActivityDetail
        activity={selected}
        mode="mentor"
        onBack={() => {
          setSelected(null);
          load();
        }}
        onUpdated={load}
      />
    );
  }

  if (view === "templates") {
    return (
      <div className={style.activityTab}>
        <Button type="ghost" onClick={() => setView("list")} style={{ marginBottom: 12 }}>
          ← 활동 목록
        </Button>
        <ActivityTemplateList />
      </div>
    );
  }

  return (
    <div className={style.activityTab}>
      <div className={style.header}>
        <div className={style.title}>교육활동</div>
        {canManage && (
          <div className={style.actions}>
            <Button type="ghost" onClick={() => setView("templates")}>
              템플릿 관리
            </Button>
            <Button type="ghost" onClick={() => setCreatePopup(true)}>
              + 활동 만들기
            </Button>
          </div>
        )}
      </div>
      <ActivityList activities={activities} onSelect={setSelected} showDraft={canManage} />
      {createPopup && (
        <ActivityCreatePopup
          syllabusId={syllabusId}
          setPopupActive={setCreatePopup}
          onCreated={load}
        />
      )}
    </div>
  );
};

export default ActivityTab;
