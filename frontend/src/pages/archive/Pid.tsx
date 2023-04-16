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

type Props = {};

const ArchiveField = (props: Props) => {
  const { pid } = useParams(); // archive label ex) 인적 사항
  const { RegistrationApi } = useApi();
  const { currentUser, currentSchool, currentRegistration } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [, setRegistrationList] = useState<any[]>([]);
  const [selectedRegistrationList, setSelectedRegistrationList] = useState<
    any[]
  >([]);
  const registrationListRef = useRef<any>([]);

  const [selectPopupAtcive, setSelectPopupActive] = useState<boolean>(false);

  useEffect(() => {
    if (currentRegistration && pid) {
      setIsLoading(true);
    }
  }, [currentRegistration, pid]);

  useEffect(() => {
    if (isLoading) {
      if (
        !currentRegistration ||
        currentRegistration?.role !== "teacher" ||
        !formArchive().authTeacher ||
        formArchive().authTeacher === "undefined"
      ) {
        alert("접근 권한이 없습니다.");
        navigate("/");
      }
      if (formArchive().authTeacher === "viewAndEditStudents") {
        RegistrationApi.RRegistrations({
          season: currentRegistration.season,
          role: "student",
        })
          .then((res) => {
            console.log(selectedRegistrationList);
            const registrations = _.sortBy(res, ["grade", "userName"]).map(
              (registration) => {
                registration.tableRowChecked =
                  _.findIndex(selectedRegistrationList, {
                    _id: registration._id,
                  }) !== -1;
                return registration;
              }
            );
            setRegistrationList(registrations);
            registrationListRef.current = registrations;
          })
          .then(() => setIsLoading(false));
      } else if (formArchive().authTeacher === "viewAndEditMyStudents") {
        RegistrationApi.RRegistrations({
          season: currentRegistration.season,
          role: "student",
          teacher: currentUser._id,
        }).then((res1) => {
          RegistrationApi.RRegistrations({
            season: currentRegistration.season,
            role: "student",
            subTeacher: currentUser._id,
          })
            .then((res2) => {
              const registrations = _.sortBy(
                [...res1, ...res2],
                ["grade", "userName"]
              ).map((registration) => {
                registration.tableRowChecked =
                  _.findIndex(selectedRegistrationList, {
                    _id: registration._id,
                  }) !== -1;
                return registration;
              });
              setRegistrationList(registrations);
              registrationListRef.current = registrations;
              setSelectedRegistrationList(
                selectedRegistrationList.filter(
                  (registration: any) =>
                    registration.teacher === currentUser._id ||
                    registration.subTeacher === currentUser._id
                )
              );
            })
            .then(() => setIsLoading(false));
        });
      }
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
            const reg = _.find(registrationListRef.current, {
              _id: registration._id,
            });
            if (reg) reg.tableRowChecked = false;
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
      })[0] ?? { authTeacher: "undefined", fields: [] }
    );
  }

  return !isLoading ? (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>{pid}</div>

        <div className={style.categories}>{selectedStudents()}</div>

        {formArchive().dataType === "object" ? (
          <ObjectView registrationList={selectedRegistrationList}></ObjectView>
        ) : (
          <ArrayView registrationList={selectedRegistrationList}></ArrayView>
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
                  _.sortBy(
                    _.filter(registrationListRef.current, {
                      tableRowChecked: true,
                    }),
                    ["userName"]
                  )
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
