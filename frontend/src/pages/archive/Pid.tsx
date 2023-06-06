import Tab from "components/tab/Tab";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

import Navbar from "layout/navbar/Navbar";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import style from "style/pages/archive.module.scss";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";

import ArrayView from "./tab/ArrayView";
import ObjectView from "./tab/ObjectView";
import Loading from "components/loading/Loading";
import { TSeasonRegistration } from "types/auth";

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid: _pid } = useParams(); // archive label ex) 인적 사항
  const { currentUser, currentSchool, currentRegistration, currentSeason } =
    useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pid, setPid] = useState<string>();

  const [, setRegistrationList] = useState<any[]>([]);
  const [selectedRegistrationList, setSelectedRegistrationList] = useState<
    any[]
  >([]);
  const registrationListRef = useRef<any>([]);

  const [selectPopupAtcive, setSelectPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && currentRegistration?.role && currentSeason?._id && _pid) {
      setIsLoading(true);
    }
  }, [currentRegistration, currentSeason, _pid]);

  useEffect(() => {
    if (isLoading) {
      if (
        currentRegistration?.role !== "teacher" ||
        !formArchive().authTeacher ||
        formArchive().authTeacher === "undefined"
      ) {
        alert("접근 권한이 없습니다.");
        navigate("/");
      }

      let registrations: (TSeasonRegistration & {
        tableRowChecked?: boolean;
      })[] = [];

      if (formArchive().authTeacher === "viewAndEditStudents") {
        /* 1. 모든 선생님이 수정할 수 있는 양식인 경우 */
        registrations = currentSeason.registrations.filter(
          (reg) => reg.role === "student"
        );
      } else if (formArchive().authTeacher === "viewAndEditMyStudents") {
        /* 2. 선생님이 담당 학생만 수정할 수 있는 양식인 경우 */
        registrations = currentSeason.registrations.filter(
          (reg) =>
            reg.role === "student" &&
            (reg?.teacher === currentUser._id ||
              reg?.subTeacher === currentUser._id)
        );
      } else {
        alert("잘못된 양식입니다.");
        return navigate("/");
      }

      registrations = registrations.map(
        (reg: TSeasonRegistration & { tableRowChecked?: boolean }) => {
          reg.tableRowChecked =
            _.findIndex(selectedRegistrationList, {
              _id: reg._id,
            }) !== -1;
          return reg;
        }
      );

      setPid(_pid);
      setRegistrationList(registrations);
      setSelectedRegistrationList(
        registrations.filter((reg) => reg.tableRowChecked)
      );
      registrationListRef.current = registrations;
      setIsLoading(false);
    }
  }, [isLoading]);

  const selectedStudents = () => {
    if (selectedRegistrationList.length === 0) {
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
    return (
      <>
        <div
          className={style.category}
          onClick={() => setSelectPopupActive(true)}
        >
          선택된 학생 수: {selectedRegistrationList.length}
        </div>
        {selectedRegistrationList.map((registration: any, idx: number) => (
          <div
            className={style.category}
            onClick={() => {
              selectedRegistrationList.splice(idx, 1);
              setSelectedRegistrationList([...selectedRegistrationList]);
              const reg = _.find(registrationListRef.current, {
                _id: registration._id,
              });
              if (reg) reg.tableRowChecked = false;
            }}
          >
            {registration.userName}
          </div>
        ))}
      </>
    );
  };

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === _pid;
      })[0] ?? { authTeacher: "undefined", fields: [] }
    );
  }

  return !isLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>

        <div className={style.categories_container}>
          <div className={style.categories}>{selectedStudents()}</div>
        </div>

        {!isLoading &&
          pid &&
          (formArchive().dataType === "object" ? (
            <ObjectView
              pid={pid}
              registrationList={selectedRegistrationList}
            ></ObjectView>
          ) : (
            <ArrayView
              pid={pid}
              registrationList={selectedRegistrationList}
            ></ArrayView>
          ))}
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
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default ArchiveField;
