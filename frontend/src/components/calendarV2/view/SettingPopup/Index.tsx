import Popup from "components/popup/Popup";
import Tab from "components/tab/Tab";

import EnrolledCourseTab from "./tab/EnrolledCourseTab";
import MentoringCourseTab from "./tab/MentoringCourseTab";
import CalendarTab from "./tab/CalendarTab";
import { useState } from "react";
import { useAuth } from "contexts/authContext";

type CalendarSettings = {
  visibleDays: number[];
  referenceTime: string | null;
  categoryColors: Record<string, string>;
};

type Props = {
  setPopupActive: any;
  onVisibilityChange?: () => void;
  onSettingsChange?: (settings: CalendarSettings) => void;
  calendarSettings?: CalendarSettings;
  userId?: string;
};

const Index = (props: Props) => {
  const { currentRegistration } = useAuth();
  const [isReloadRequired, setIsReloadRequired] = useState<boolean>(false);

  const isViewingOther = !!props.userId;
  const courseItems: Record<string, JSX.Element> = {};

  if (currentRegistration?._id) {
    if (currentRegistration?.role === "teacher" || isViewingOther) {
      courseItems["담당 수업"] = (
        <MentoringCourseTab setIsReloadRequired={setIsReloadRequired} userId={props.userId} />
      );
      courseItems["수강 현황"] = (
        <EnrolledCourseTab setIsReloadRequired={setIsReloadRequired} userId={props.userId} />
      );
    } else {
      courseItems["수강 중인 수업"] = (
        <EnrolledCourseTab setIsReloadRequired={setIsReloadRequired} userId={props.userId} />
      );
    }
  }

  return (
    <Popup
      setState={() => {
        if (isReloadRequired) {
          window.location.reload();
        }
        props.setPopupActive(false);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "520px",
        maxWidth: "100%",
      }}
      closeBtn
      title={"캘린더 설정"}
      contentScroll
    >
      <Tab
        dontUsePaths
        items={{
          캘린더: (
            <CalendarTab
              onVisibilityChange={props.onVisibilityChange}
              onSettingsChange={props.onSettingsChange}
              calendarSettings={props.calendarSettings}
              isViewingOther={isViewingOther}
              userId={props.userId}
            />
          ),
          ...courseItems,
        }}
        align={"flex-start"}
      />
    </Popup>
  );
};

export default Index;
