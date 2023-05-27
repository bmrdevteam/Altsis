import Navbar from "layout/navbar/Navbar";

import style from "style/pages/admin/schools.module.scss";

export default function Example() {
  return (
    <div>
      <Navbar />
      <div className={style.section} style={{ backgroundColor: "white" }}>
        {"실험 중인 기능입니다."}
      </div>
    </div>
  );
}
