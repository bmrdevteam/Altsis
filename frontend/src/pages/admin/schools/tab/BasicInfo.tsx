import React from "react";
import Autofill from "../../../../components/input/Autofill";
import Input from "../../../../components/input/Input";
import style from "../../../../style/pages/admin/schools/schools.module.scss";
type Props = {};

const BasicInfo = (props: Props) => {
  return (
    <div>
      <div
        style={{
          display: "flex",
          width: "100%",
          gap: "24px",
        }}
      >
        <Input label="학교명" />
        <Input label="학교ID" />
      </div>
      <Autofill label="관리자" options={["goat@gmail.com","ebfhschool@gmail.com","asdf","ramdonId","한국어","한구어@?"]} />
    </div>
  );
};

export default BasicInfo;
