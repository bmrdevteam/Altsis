import { useAuth } from "contexts/authContext";
import CourseActivityTab from "pages/courses/activity/ActivityTab";

type Props = {
  syllabusId: string;
};

const ActivityTab = ({ syllabusId }: Props) => {
  const { currentRegistration, currentUser } = useAuth();
  const isStaff =
    currentUser?.auth === "manager" || currentUser?.auth === "admin";
  const hasPermission = isStaff || !!currentRegistration?.permissionActivityV2;

  return (
    <CourseActivityTab
      syllabusId={syllabusId}
      hasPermission={hasPermission}
      canManage={false}
    />
  );
};

export default ActivityTab;
