import Popup from "components/popup/Popup";
import Tab from "components/tab/Tab";

import EnrolledCourseTab from "./tab/EnrolledCourseTab";
import MentoringCourseTab from "./tab/MentoringCourseTab";
import GoogleCalendarTab from "./tab/GoogleCalendarTab";
import { useState } from "react";
import { useAuth } from "contexts/authContext";

type Props = {
  setPopupActive: any;
};

const Index = (props: Props) => {
  const { currentRegistration } = useAuth();
  const [isReloadRequired, setIsReloadRequired] = useState<boolean>(false);

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
      }}
      closeBtn
      title={"캘린더 설정"}
      contentScroll
    >
      <Tab
        dontUsePaths
        items={
          currentRegistration?.role === "teacher"
            ? {
                "담당 수업": (
                  <MentoringCourseTab
                    setIsReloadRequired={setIsReloadRequired}
                  />
                ),
                "수강 현황": (
                  <EnrolledCourseTab
                    setIsReloadRequired={setIsReloadRequired}
                  />
                ),
                "구글 캘린더 연동": (
                  <GoogleCalendarTab
                    setIsReloadRequired={setIsReloadRequired}
                  />
                ),
              }
            : {
                "수강 중인 수업": (
                  <EnrolledCourseTab
                    setIsReloadRequired={setIsReloadRequired}
                  />
                ),
                "구글 캘린더 연동": (
                  <GoogleCalendarTab
                    setIsReloadRequired={setIsReloadRequired}
                  />
                ),
              }
        }
        align={"flex-start"}
      />
    </Popup>
  );
};

export default Index;
