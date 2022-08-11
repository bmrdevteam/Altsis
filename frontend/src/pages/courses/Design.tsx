import React from "react";
import Input from "../../components/input/Input";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import Select from "../../components/select/Select";
import style from "../../style/pages/courses/courseDesign.module.scss";
type Props = {};

const CourseDesign = (props: Props) => {
  return (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>수업 개설</div>
      <div style={{ display: "flex", gap: "24px" }}>
        <Input label="수업명" required={true} />
        <Input label="작성자" required={true} disabled defaultValue="이세찬" />
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
        <Select
          options={[
            { text: "1", value: "1" },
            { text: "2", value: "2  " },
          ]}
          label="학점"
          required
        />
      </div>
    </div>
  );
};

export default CourseDesign;
