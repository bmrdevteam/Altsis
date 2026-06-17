import { useEffect, useMemo, useState } from "react";
import Loading from "components/loading/Loading";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TActivity } from "types/activity";
import ActivityCreatePopup from "./ActivityCreatePopup";
import ActivityDetail from "./ActivityDetail";
import ActivityList from "./ActivityList";
import style from "./activity.module.scss";

type Props = {
  syllabusId: string;
  hasPermission: boolean;
  canManage: boolean;
};

const sortActivities = (activities: TActivity[]) => {
  return [...activities].sort((a, b) => {
    const orderGap = (a.order || 0) - (b.order || 0);
    if (orderGap !== 0) return orderGap;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
};

const ActivityTab = ({ syllabusId, hasPermission, canManage }: Props) => {
  const { ActivityAPI } = useAPIv2();

  const [activities, setActivities] = useState<TActivity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [createPopupActive, setCreatePopupActive] = useState(false);

  const visibleActivities = useMemo(() => {
    if (canManage) return activities;
    return activities.filter((activity) => activity.status !== "draft");
  }, [activities, canManage]);

  const selectedActivity = useMemo(
    () =>
      visibleActivities.find((activity) => activity._id === selectedActivityId) ||
      null,
    [visibleActivities, selectedActivityId]
  );

  const loadActivities = async () => {
    if (!hasPermission) return;
    setIsLoading(true);
    try {
      const { activities: loadedActivities } = await ActivityAPI.RActivities({
        query: { syllabus: syllabusId },
      });
      const sorted = sortActivities(loadedActivities);
      setActivities(sorted);
      setSelectedActivityId((prev) =>
        prev && sorted.some((activity) => activity._id === prev)
          ? prev
          : sorted[0]?._id || ""
      );
    } catch (error) {
      ALERT_ERROR(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [syllabusId, hasPermission]);

  useEffect(() => {
    if (!selectedActivityId && visibleActivities[0]) {
      setSelectedActivityId(visibleActivities[0]._id);
      return;
    }
    if (
      selectedActivityId &&
      !visibleActivities.some((activity) => activity._id === selectedActivityId)
    ) {
      setSelectedActivityId(visibleActivities[0]?._id || "");
    }
  }, [visibleActivities, selectedActivityId]);

  if (!hasPermission) {
    return (
      <div className={style.panel}>
        <div className={style.panelHeader}>
          <div className={style.panelTitle}>교육활동</div>
        </div>
        <div className={style.empty}>교육활동 접근 권한이 없습니다.</div>
      </div>
    );
  }

  if (isLoading && activities.length === 0) {
    return <Loading height="420px" />;
  }

  return (
    <>
      <div className={style.activityTab}>
        <ActivityList
          activities={visibleActivities}
          selectedActivityId={selectedActivityId}
          onSelect={(activity) => setSelectedActivityId(activity._id)}
          onRefresh={loadActivities}
          onCreate={canManage ? () => setCreatePopupActive(true) : undefined}
        />

        <ActivityDetail
          activity={selectedActivity}
          canManage={canManage}
          onUpdated={(updatedActivity) => {
            setActivities((prev) =>
              sortActivities(
                prev.map((item) =>
                  item._id === updatedActivity._id ? updatedActivity : item
                )
              )
            );
          }}
          onDeleted={(activityId) => {
            setActivities((prev) => prev.filter((item) => item._id !== activityId));
            setSelectedActivityId("");
          }}
        />
      </div>

      {canManage && createPopupActive && (
        <ActivityCreatePopup
          syllabusId={syllabusId}
          onClose={() => setCreatePopupActive(false)}
          onCreated={(createdActivity) => {
            setActivities((prev) => sortActivities([...prev, createdActivity]));
            setSelectedActivityId(createdActivity._id);
          }}
        />
      )}
    </>
  );
};

export default ActivityTab;
