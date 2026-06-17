import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TActivity } from "types/activity";
import style from "style/pages/courses/activity.module.scss";
import ActivityList from "../../activity/ActivityList";
import ActivityDetail from "../../activity/ActivityDetail";

type Props = {
  syllabusId: string;
};

const EnrolledActivityTab = ({ syllabusId }: Props) => {
  const { ActivityAPI } = useAPIv2();
  const [activities, setActivities] = useState<TActivity[]>([]);
  const [selected, setSelected] = useState<TActivity | null>(null);

  useEffect(() => {
    ActivityAPI.RActivities({ query: { syllabus: syllabusId } })
      .then(({ activities: list }) =>
        setActivities(list.filter((a) => a.status !== "draft"))
      )
      .catch(ALERT_ERROR);
  }, [syllabusId]);

  if (selected) {
    return (
      <ActivityDetail activity={selected} mode="student" onBack={() => setSelected(null)} />
    );
  }

  return (
    <div className={style.activityTab}>
      <div className={style.title}>교육활동</div>
      <ActivityList activities={activities} onSelect={setSelected} showDraft={false} />
    </div>
  );
};

export default EnrolledActivityTab;
