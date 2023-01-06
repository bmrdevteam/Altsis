import Divider from "components/divider/Divider";
import Autofill from "components/input/Autofill";
import Select from "components/select/Select";
import Tab from "components/tab/Tab";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";
import useDatabase from "hooks/useDatabase";
import Navbar from "layout/navbar/Navbar";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import style from "style/pages/archive.module.scss";
import Group from "./tab/Group";
import One from "./tab/One";
import Three from "./tab/Three";

type Props = {};

const ArchiveField = (props: Props) => {
  const database = useDatabase();
  const { pid } = useParams();
  const { RegistrationApi, ArchiveApi } = useApi();

  const { currentSchool, currentSeason } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [grades, setGrades] = useState<{ text: string; value: string }[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [archiveData, setArchiveData] = useState<any>();
  const [archiveForm, setArchiveForm] = useState<any>();
  const formData = useRef<any>();

  useEffect(() => {
    RegistrationApi.RRegistrations({
      schoolId: currentSchool?.schoolId,
      season: currentSeason?._id,
      role: "student",
    }).then((res) => {
      const g: any = _.uniqBy(res, "grade");
      setGrades(
        g.map((val: any) => {
          return { text: val.grade, value: val.grade };
        })
      );
      setSelectedGrade(g[0]?.grade);
      setUsers(res);
    });

    database
      .R({
        location: `schools/${currentSchool.school}`,
      })
      .then((res) => {
        setArchiveForm(res);
      });
  }, [currentSeason]);

  useEffect(() => {
    if (userId !== "") {
      database
        .R({
          location: `archives?school=${currentSchool.school}&userId=${userId}`,
        })
        .then((res) => {
          setArchiveData(res.data);
        });
    }
  }, [userId]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>
        <Tab
          items={{
            "학생별 입력": (
              <>
                <div className={style.search}>
                  <div className={style.label}>학생선택</div>
                  <Select
                    options={grades}
                    onChange={(val: any) => {
                      setSelectedGrade(val);
                    }}
                    style={{ borderRadius: "4px", maxWidth: "120px" }}
                  />
                  <Autofill
                    style={{ borderRadius: "4px" }}
                    setState={setUserId}
                    onChange={(v) => {
                      ArchiveApi.RArchives({
                        userId: v,
                        school: currentSchool.school,
                      }).then((res) => {
                        formData.current = res;
                      });
                    }}
                    defaultValue={userId}
                    options={[
                      { text: "", value: "" },
                      ...users
                        ?.filter((val) => val.grade === selectedGrade)
                        .map((val) => {
                          return {
                            value: val.userId,
                            text: `${val.userName} / ${val.userId}`,
                          };
                        }),
                    ]}
                    placeholder={"검색"}
                  />
                </div>
                <Divider />
                <Three
                  formData={formData}
                  users={users}
                  archive={pid}
                  setUserId={setUserId}
                  userId={userId}
                  userArchiveData={archiveData?.[pid ?? ""]}
                />
              </>
            ),
            "그룹별 입력": <Group />,
          }}
        ></Tab>
      </div>
    </>
  );
};

export default ArchiveField;
