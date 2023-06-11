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
import { useState, useRef } from "react";
import { useAuth } from "contexts/authContext";

// components
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import _ from "lodash";
import Button from "components/button/Button";
import useAPIv2 from "hooks/useAPIv2";
import { MESSAGE } from "hooks/_message";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";
type Props = {
  setPopupActive: any;
  courseData: any;
  setIsEnrollmentListLoading: any;
};

const EnrollBulkPopup = (props: Props) => {
  const { currentSeason } = useAuth();
  const { EnrollmentAPI } = useAPIv2();

  const selectRef = useRef<any[]>([]);

  const [progressPopupActive, setProgressPopupActive] =
    useState<boolean>(false);

  const [ratio, setRatio] = useState<number>(0);
  const [failedList, setFailedList] = useState<
    { userName: string; message: string }[]
  >([]);

  const onClickSubmitHandler = async () => {
    if (selectRef.current.length === 0) {
      return alert("초대할 학생을 선택해주세요.");
    }

    setProgressPopupActive(true);

    const failedList: { userName: string; message: string }[] = [];

    for (let i = 0; i < selectRef.current.length; i++) {
      try {
        await EnrollmentAPI.CEnrollment({
          data: {
            registration: selectRef.current[i]._id,
            syllabus: props.courseData._id,
          },
        });
      } catch (err: any) {
        failedList.push({
          userName: selectRef.current[i].userName,
          message:
            MESSAGE.get(err.response?.data?.message ?? "UNKNOWN") ??
            "알 수 없는 에러가 발생했습니다.",
        });
      } finally {
        setRatio((i + 1) / selectRef.current.length);
      }
    }
    setFailedList(failedList);
  };

  return (
    <>
      <Popup
        setState={props.setPopupActive}
        closeBtn
        title={"초대할 학생 선택"}
        contentScroll
        footer={
          <Button type="ghost" onClick={onClickSubmitHandler}>
            초대하기
          </Button>
        }
      >
        <Table
          data={currentSeason?.registrations || []}
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
      </Popup>

      {progressPopupActive && (
        <Popup
          setState={() => {}}
          style={{ maxWidth: "640px", width: "100%" }}
          title="수강생 초대"
          contentScroll
        >
          <div>
            <Progress value={ratio} style={{ margin: "12px 0px" }} />
            {failedList.length > 0 && (
              <Callout
                type="error"
                style={{ whiteSpace: "pre" }}
                title={"초대 실패한 학생이 있습니다."}
                description={failedList
                  .map(({ userName, message }) => `${userName}: ${message}`)
                  .join("\n")}
              />
            )}
            {ratio === 1 && (
              <div>
                <Button
                  type={"ghost"}
                  onClick={() => {
                    props.setIsEnrollmentListLoading(true);
                    props.setPopupActive(false);
                  }}
                  style={{
                    borderRadius: "4px",
                    height: "32px",
                    boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                    marginTop: "24px",
                  }}
                >
                  확인
                </Button>
              </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
};

export default EnrollBulkPopup;
