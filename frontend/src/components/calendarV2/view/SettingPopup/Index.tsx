import Popup from "components/popup/Popup";
import Tab from "components/tab/Tab";

import GoogleCalendarTab from "./tab/GoogleCalendarTab";

type Props = {
  setPopupActive: any;
};

const Index = (props: Props) => {
  return (
    <Popup
      setState={props.setPopupActive}
      style={{
        width: "480px",
        display: "flex",
        flexDirection: "column",
      }}
      closeBtn
      title={"캘린더 설정"}
      contentScroll
    >
      <Tab
        dontUsePaths
        items={{
          "구글 캘린더 연동": <GoogleCalendarTab />,
        }}
        align={"flex-start"}
      />
    </Popup>
  );
};

export default Index;
