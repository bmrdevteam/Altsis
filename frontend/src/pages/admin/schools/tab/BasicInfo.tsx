import React from "react";
import Autofill from "../../../../components/input/Autofill";
import Input from "../../../../components/input/Input";
import style from "../../../../style/pages/admin/schools/schools.module.scss";
type Props = {
  school?: any;
};

const BasicInfo = (props: Props) => {
  return (
    <div>
      <div
        style={{
          display: "flex",
          width: "100%",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        <Input
          label="학교명"
          defaultValue={props.school?.schoolName}
          required
        />
        <Input label="학교ID" defaultValue={props.school?.schoolId} required />
      </div>
      <div
        style={{
          display: "flex",
          width: "100%",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        <Autofill label="관리자" options={[{ text: "a", value: 0 }]} />
        <Autofill label="관리자" options={[{ text: "a", value: 0 }]} />
      </div>
    </div>
  );
};

export default BasicInfo;
