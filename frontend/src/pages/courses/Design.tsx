import _ from "lodash";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/button/Button";
import Autofill from "../../components/input/Autofill";
import Input from "../../components/input/Input";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import Popup from "../../components/popup/Popup";
import Select from "../../components/select/Select";
import { useAuth } from "../../contexts/authContext";
import EditorParser from "../../editor/EditorParser";
import useDatabase from "../../hooks/useDatabase";
import style from "../../style/pages/courses/courseDesign.module.scss";
type Props = {};

const CourseDesign = (props: Props) => {
  const { currentSchoolUser } = useAuth();
  const database = useDatabase();
  const navigate = useNavigate();

  const [schoolData, setSchoolData] = useState<any>();
  const [alertPopupActive, setAlertPopupActive] = useState<boolean>(false);

  async function getSchoolList() {
    const { schools: res } = await database.R({ location: "schools/list" });
    return res;
  }
  useEffect(() => {
    getSchoolList().then((res) =>
      setSchoolData(
        res.filter(
          (val: any) => val.schoolId === currentSchoolUser?.schoolId
        )[0]
      )
    );

    if (currentSchoolUser === null || currentSchoolUser === undefined) {
      setAlertPopupActive(true);
    }
  }, []);
  function getClassrooms() {
    let result: any[] = [];
    schoolData?.classrooms?.map((value: string, index: number) => {
      result.push({ text: value, value: index });
    });
    return result;
  }

  return (
    <>
      <div className={style.section}>
        <NavigationLinks />
        <div className={style.design_form}>
          <div className={style.title}>수업 개설</div>
          <div style={{ display: "flex", gap: "24px" }}>
            <Input inputStyle="flat" label="수업명" required={true} />
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              inputStyle="flat"
              label="작성자"
              required={true}
              disabled
              defaultValue={currentSchoolUser?.userName}
            />
            <Select
              appearence="flat"
              options={[
                { text: "이세찬", value: "1" },
                { text: "나도몰라", value: "2" },
              ]}
              label="멘토 선택"
              required
            />

            <div style={{ display: "flex", flex: "1 1 0", gap: "24px" }}>
              <Autofill
                appearence="flat"
                options={[
                  { text: "1", value: "1" },
                  { text: "2", value: "2  " },
                ]}
                label="학점"
                required
              />
              <Autofill
                appearence="flat"
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
          <div style={{ display: "flex", marginTop: "24px" }}>
            <Select
              options={getClassrooms()}
              label="강의실 선택"
              required
              appearence="flat"
            />
          </div>
          <div style={{ display: "flex", marginTop: "24px" }}></div>
          <EditorParser id={"63057ebb49c14b8ece07bfa3"} />
        </div>
      </div>

      {alertPopupActive && (
        <Popup setState={() => {}} title="가입된 학교가 없습니다">
          <div style={{ marginTop: "24px" }}>
            <Button
              type="ghost"
              onClick={() => {
                navigate("/");
              }}
            >
              메인 화면으로 돌아가기
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default CourseDesign;
