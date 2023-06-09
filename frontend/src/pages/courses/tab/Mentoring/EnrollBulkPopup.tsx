/**
 * @file Enroll Bulk Popup
 * @page 멘토링 수업 상세페이지 - 일괄 수강신청 팝업
 *
 * more info on selected courses
 *
 * @author jessie129j <jessie129j@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */
import { useEffect, useState, useRef } from "react";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

// components
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import _ from "lodash";
import Button from "components/button/Button";
import Loading from "components/loading/Loading";
import useAPIv2 from "hooks/useAPIv2";
type Props = {
  setPopupActive: any;
  courseData: any;
  setIsEnrollmentListLoading: any;
};

const EnrollBulkPopup = (props: Props) => {
  const { currentRegistration } = useAuth();
  const { EnrollmentApi } = useApi();
  const { RegistrationAPI } = useAPIv2();

  const [registrationList, setRegistrationList] = useState<any[]>();
  const selectRef = useRef<any[]>([]);

  const [selectPopupActive, setSelectPopupActive] = useState<boolean>(true);
  const [resultPopupActive, setResultPopupActive] = useState<boolean>(false);

  const [enrollments, setEnrollments] = useState<any[]>();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    RegistrationAPI.RRegistrations({
      query: { season: props.courseData.season },
    }).then(({ registrations }: any) => {
      setRegistrationList(registrations);
    });
    return () => {};
  }, []);

  return (
    <>
      {selectPopupActive && (
        <Popup
          setState={props.setPopupActive}
          closeBtn
          title={"초대할 학생 선택"}
          contentScroll
          footer={
            <Button
              disabled={isLoading}
              type="ghost"
              onClick={() => {
                if (selectRef.current.length === 0) {
                  alert("초대할 학생을 선택해주세요.");
                } else {
                  setIsLoading(true);
                  EnrollmentApi.CEnrollments({
                    data: {
                      registration: currentRegistration._id,
                      syllabus: props.courseData._id,
                      students: selectRef.current.map((registration: any) => {
                        return {
                          _id: registration.user,
                          userId: registration.userId,
                          userName: registration.userName,
                          grade: registration.grade,
                        };
                      }),
                    },
                  })
                    .then((res: any) => {
                      props.setIsEnrollmentListLoading(true);
                      setEnrollments(_.sortBy(res));
                      setSelectPopupActive(false);
                      setResultPopupActive(true);
                    })
                    .catch((err: any) => alert(err.response.data.message));
                }
              }}
            >
              초대하기
            </Button>
          }
        >
          {!isLoading ? (
            <Table
              data={registrationList || []}
              type="object-array"
              control
              defaultPageBy={50}
              onChange={(value: any[]) => {
                selectRef.current = _.filter(value, {
                  tableRowChecked: true,
                });
              }}
              header={[
                {
                  text: "checkbox",
                  key: "",
                  type: "checkbox",
                  width: "48px",
                },
                {
                  text: "역할",
                  key: "role",
                  textAlign: "center",
                  type: "status",
                  status: {
                    teacher: { text: "선생님", color: "blue" },
                    student: { text: "학생", color: "orange" },
                  },
                },
                {
                  text: "학년",
                  key: "grade",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "이름",
                  key: "userName",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "ID",
                  key: "userId",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "그룹",
                  key: "group",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "선생님 ID",
                  key: "teacherId",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "선생님 이름",
                  key: "teacherName",
                  type: "text",
                  textAlign: "center",
                },
              ]}
            />
          ) : (
            <div style={{ marginTop: "24px" }}>
              <Loading text="초대중" />
            </div>
          )}
        </Popup>
      )}
      {resultPopupActive && (
        <Popup
          setState={props.setPopupActive}
          closeBtn
          title={"초대 결과"}
          contentScroll
          footer={
            <Button
              type="ghost"
              onClick={() => {
                setResultPopupActive(false);
                props.setPopupActive(false);
              }}
            >
              확인
            </Button>
          }
        >
          <Table
            data={enrollments || []}
            type="object-array"
            control
            defaultPageBy={50}
            header={[
              {
                text: "No",
                type: "text",
                key: "tableRowIndex",
                width: "48px",
                textAlign: "center",
              },
              {
                text: "학년",
                key: "grade",
                type: "text",
                textAlign: "center",
              },
              {
                text: "이름",
                key: "userName",
                type: "text",
                textAlign: "center",
              },
              {
                text: "ID",
                key: "userId",
                type: "text",
                textAlign: "center",
              },

              {
                text: "결과",
                key: "success.status",
                textAlign: "center",
                type: "status",
                status: {
                  true: { text: "성공", color: "green" },
                  false: { text: "실패", color: "red" },
                },
              },
              {
                text: "",
                key: "success.message",
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

export default EnrollBulkPopup;
