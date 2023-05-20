import Navbar from "layout/navbar/Navbar";
import style from "style/pages/admin/schools.module.scss";

import Tab from "components/tab/Tab";
import Basic from "./tab/Basic";
import Calendar from "./tab/Calendar";

export default function Example() {
  return (
    <div>
      <Navbar />
      <div className={style.section}>
        <Tab
          items={{
            "기본 정보": <Basic />,
            캘린더: <Calendar />,
          }}
          align={"flex-start"}
        />
      </div>
    </div>
  );
}
