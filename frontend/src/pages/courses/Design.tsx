import React from "react";
import Autofill from "../../components/input/Autofill";
import Input from "../../components/input/Input";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import Select from "../../components/select/Select";
import { useAuth } from "../../contexts/authContext";
import style from "../../style/pages/courses/courseDesign.module.scss";
type Props = {};

const CourseDesign = (props: Props) => {
  const { currentUser } = useAuth();


  
  return (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>수업 개설</div>
      <div style={{ display: "flex", gap: "24px" }}>
        <Input label="수업명" required={true} />
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
        <Input
          label="작성자"
          required={true}
          disabled
          defaultValue={currentUser.userName}
        />
        <Select
          options={[
            { text: "이세찬", value: "1" },
            { text: "나도몰라", value: "2  " },
          ]}
          label="멘토 선택"
          required
        />

        <div style={{ display: "flex", flex: "1 1 0", gap: "24px" }}>
          <Autofill
            options={[
              { text: "1", value: "1" },
              { text: "2", value: "2  " },
            ]}
            label="학점"
            required
          />
          <Autofill
            options={[
              { text: "상", value: "1" },
              { text: "중", value: "3" },
              { text: "하", value: "4" },
            ]}
            label="난의도"
            required
          />
        </div>
      </div>
      <div style={{ display: "flex",marginTop:"24px" }}>
        <Autofill
          options={[
            { text: "101호", value: "1" },
            { text: "201호", value: "2  " },
          ]}
          label="강의실"
          required
        />
        <div>시간표 양식</div>
      </div>
    </div>
  );
};

export default CourseDesign;
