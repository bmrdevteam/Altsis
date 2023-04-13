import Divider from "components/divider/Divider";
import Autofill from "components/input/Autofill";
import Select from "components/select/Select";
import Tab from "components/tab/Tab";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

import Navbar from "layout/navbar/Navbar";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import style from "style/pages/archive.module.scss";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";

import Four from "./tab/Four";

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid } = useParams(); // archive label ex) 인적 사항
  const { RegistrationApi } = useApi();
  const { currentSeason, currentSchool } = useAuth();

  const [, setRegistrationList] = useState<any[]>([]);
  const [selectedRegistrationList, setSelectedRegistrationList] = useState<
    any[]
  >([]);
  const registrationListRef = useRef<any>([]);

  const [selectPopupAtcive, setSelectPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (currentSeason?._id && pid) {
      RegistrationApi.RRegistrations({
        season: currentSeason._id,
        role: "student",
      }).then((res) => {
        const registrations = _.sortBy(res, ["grade", "userName"]);
        setRegistrationList(registrations);
        registrationListRef.current = registrations;
      });
    }
  }, [currentSeason, pid]);

  const selectedStudents = () => {
    if (registrationListRef.current.length === 0) {
      return (
        <div
          className={style.category}
          onClick={() => {
            setSelectPopupActive(true);
          }}
        >
          조회할 학생을 선택해주세요
        </div>
      );
    }
    return [
      <div
        className={style.category}
        onClick={() => setSelectPopupActive(true)}
      >
        선택된 학생 수: {selectedRegistrationList.length}
      </div>,
      ...selectedRegistrationList.map((registration: any, idx: number) => (
        <div
          className={style.category}
          onClick={() => {
            selectedRegistrationList.splice(idx, 1);
            setSelectedRegistrationList([...selectedRegistrationList]);
            registrationListRef.current[idx].tableRowChecked = false;
          }}
        >
          {registration.userName}
        </div>
      )),
    ];
  };

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === pid;
      })[0] ?? { fields: [] }
    );
  }

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>

        <div className={style.categories}>{selectedStudents()}</div>

        {formArchive().dataType === "object" ? (
          <Tab
            items={{
              임시: <div style={{ marginTop: "24px" }}></div>,
            }}
          ></Tab>
        ) : (
          <Tab
            items={{
              "조회 및 수정": (
                <Four registrationList={selectedRegistrationList}></Four>
              ),
              입력: <div style={{ marginTop: "24px" }}></div>,
            }}
          ></Tab>
        )}
      </div>
      {selectPopupAtcive && (
        <Popup
          setState={setSelectPopupActive}
          title="학생 선택"
          closeBtn
          contentScroll
          footer={
            <Button
              type="ghost"
              onClick={() => {
                setSelectedRegistrationList(
                  _.filter(registrationListRef.current, {
                    tableRowChecked: true,
                  })
                );
                setSelectPopupActive(false);
              }}
            >
              선택
            </Button>
          }
        >
          <Table
            data={registrationListRef.current}
            type="object-array"
            control
            onChange={(value: any[]) => {
              registrationListRef.current = value;
            }}
            header={[
              {
                text: "checkbox",
                key: "",
                type: "checkbox",
                width: "48px",
              },
              {
                text: "학년",
                key: "grade",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },
              {
                text: "이름",
                key: "userName",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },
              {
                text: "ID",
                key: "userId",
                type: "text",
                textAlign: "center",
                whiteSpace: "pre",
              },

              {
                text: "그룹",
                key: "group",
                type: "text",
                textAlign: "center",
              },
              {
                text: "담임 선생님",
                key: "teacherName",
                type: "text",
                textAlign: "center",
              },
              {
                text: "부담임 선생님",
                key: "subTeacherName",
                type: "text",
                textAlign: "center",
              },
            ]}
          />
        </Popup>
      )}
    </>
  );
};

export default ArchiveField;
