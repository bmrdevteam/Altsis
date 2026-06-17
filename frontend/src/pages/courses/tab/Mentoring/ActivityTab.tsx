import { useAuth } from "contexts/authContext";
import CourseActivityTab from "pages/courses/activity/ActivityTab";

type Props = {
  syllabusId: string;
  isMentor: boolean;
};

const ActivityTab = ({ syllabusId, isMentor }: Props) => {
  const { currentRegistration, currentUser } = useAuth();
  const isStaff =
    currentUser?.auth === "manager" || currentUser?.auth === "admin";
  const hasBasePermission = !!currentRegistration?.permissionActivityV2;
  const canManage = isStaff || (isMentor && hasBasePermission);
  const hasPermission = canManage || hasBasePermission;

  return (
    <CourseActivityTab
      syllabusId={syllabusId}
      hasPermission={hasPermission}
      canManage={canManage}
    />
  );
};

export default ActivityTab;
