import Navbar from "layout/navbar/Navbar";
import style from "style/pages/admin/schools.module.scss";

import Tab from "components/tab/Tab";
import Basic from "./tab/Basic";

export default function Example() {
  return (
    <div>
      <Navbar />
      <div className={style.section}>
        <Tab
          dontUsePaths
          items={{
            "기본 정보": <Basic />,
          }}
          align={"flex-start"}
        />
      </div>
    </div>
  );
}
