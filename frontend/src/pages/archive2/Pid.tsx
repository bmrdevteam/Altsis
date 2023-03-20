import Divider from "components/divider/Divider";
import Autofill from "components/input/Autofill";
import Select from "components/select/Select";
import Tab from "components/tab/Tab";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

import Navbar from "layout/navbar/Navbar";
import _ from "lodash";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import style from "style/pages/archive.module.scss";
import Group from "./tab/Group";
import One from "./tab/One";
import Three from "./tab/Three";

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid } = useParams(); // archive label ex) 인적 사항
  const { RegistrationApi, ArchiveApi } = useApi();
  const { currentSchool, currentSeason } = useAuth();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [grades, setGrades] = useState<{ text: string; value: string }[]>([]);

  const [selectedGrade, setSelectedGrade] = useState<string>("");

  const [rid, setRid] = useState<string>("");
  const [aid, setAid] = useState<string>("");

  const [isLoadingAutofill, setIsLoadingAutofill] = useState<boolean>(false);

  useEffect(() => {
    if (isLoadingAutofill) {
      setIsLoadingAutofill(false);
    }
  }, [isLoadingAutofill]);

  useEffect(() => {
    RegistrationApi.RRegistrations({
      school: currentSchool?._id,
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
      setRegistrations(res);
    });
  }, [currentSeason]);

  useEffect(() => {
    if (rid !== "" && pid !== "") {
      ArchiveApi.RArchives({
        registration: rid,
      }).then((res) => {
        console.log(res);
        setAid(res._id);
      });
    }
  }, [rid]);

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
                      setRid("");
                      setAid("");
                      setIsLoadingAutofill(true);
                    }}
                    style={{ borderRadius: "4px", maxWidth: "120px" }}
                  />
                  {!isLoadingAutofill && (
                    <Autofill
                      style={{ borderRadius: "4px" }}
                      setState={setRid}
                      defaultValue={rid}
                      options={[
                        { text: "", value: "" },
                        ...registrations
                          ?.filter((val) => val.grade === selectedGrade)
                          .map((val) => {
                            return {
                              value: val._id,
                              text: `${val.userName} / ${val.userId}`,
                            };
                          }),
                      ]}
                      placeholder={"검색"}
                    />
                  )}
                </div>
                <Divider />
                <Three pid={pid} aid={aid} />
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
