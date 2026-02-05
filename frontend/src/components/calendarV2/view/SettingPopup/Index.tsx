import Popup from "components/popup/Popup";
import Tab from "components/tab/Tab";

import EnrolledCourseTab from "./tab/EnrolledCourseTab";
import MentoringCourseTab from "./tab/MentoringCourseTab";
import CalendarTab from "./tab/CalendarTab";
import { useState } from "react";
import { useAuth } from "contexts/authContext";

type Props = {
  setPopupActive: any;
  onVisibilityChange?: () => void;
};

const Index = (props: Props) => {
  const { currentRegistration } = useAuth();
  const [isReloadRequired, setIsReloadRequired] = useState<boolean>(false);

  const courseItems: Record<string, JSX.Element> = {};

  if (currentRegistration?._id) {
    if (currentRegistration?.role === "teacher") {
      courseItems["담당 수업"] = (
        <MentoringCourseTab setIsReloadRequired={setIsReloadRequired} />
      );
      courseItems["수강 현황"] = (
        <EnrolledCourseTab setIsReloadRequired={setIsReloadRequired} />
      );
    } else {
      courseItems["수강 중인 수업"] = (
        <EnrolledCourseTab setIsReloadRequired={setIsReloadRequired} />
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
        minWidth: "520px",
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
