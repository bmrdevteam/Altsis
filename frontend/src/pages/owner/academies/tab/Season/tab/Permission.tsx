/**
 * @file School Page Tab Item - Permission
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
import { useEffect, useState } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";

type Props = {
  seasonData: any;
};

const Permission = (props: Props) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [permissionSyllabusParsed, setPermissionSyllabusParsed] =
    useState<any>();
  const [permissionEnrollmentParsed, setPermissionEnrollmentParsed] =
    useState<any>();
  const [permissionEvaluationParsed, setPermissionEvaluationParsed] =
    useState<any>();

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);
  const [permissionType, setPermissionType] = useState<string>("");

  const [isLoadingPermissionData, setIsLoadingPermissionData] =
    useState<boolean>(false);
  const [permissionData, setPermissionData] = useState<any>();

  const parsePermission = (permission: Array<Array<any>>) => {
    let isTeacherAllowed = false;
    let isStudentAllowed = false;
    const exceptions = [];

    for (let i = 0; i < permission.length; i++) {
      if (permission[i][0] === "role") {
        if (permission[i][1] === "teacher") {
          isTeacherAllowed = permission[i][2];
        } else if (permission[i][1] === "student") {
          isStudentAllowed = permission[i][2];
        }
      } else {
        exceptions.push({
          index: i,
          userId: permission[i][1],
          isAllowed: permission[i][2],
        });
      }
    }
    return { isTeacherAllowed, isStudentAllowed, exceptions };
  };

  useEffect(() => {
    if (isLoading) {
      setPermissionSyllabusParsed(
        parsePermission(props.seasonData.permissionSyllabus || {})
      );
      setPermissionEnrollmentParsed(
        parsePermission(props.seasonData.permissionEnrollment || {})
      );
      setPermissionEvaluationParsed(
        parsePermission(props.seasonData.permissionEvaluation || {})
      );

      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoadingPermissionData) {
      if (permissionType === "syllabus")
        setPermissionData(permissionSyllabusParsed);
      else if (permissionType === "enrollment")
        setPermissionData(permissionEnrollmentParsed);
      else setPermissionData(permissionEvaluationParsed);
      setIsLoadingPermissionData(false);
    }
  }, [isLoadingPermissionData]);

  return (
    <div style={{ marginTop: "24px" }}>
      <Table
        type="object-array"
        data={
          !isLoading
            ? [
                {
                  type: "syllabus",
                  ...permissionSyllabusParsed,
                },
                {
                  type: "enrollment",
                  ...permissionEnrollmentParsed,
                },
                {
                  type: "evaluation",
                  ...permissionEvaluationParsed,
                },
              ]
            : []
        }
        header={[
          {
            text: "권한",
            key: "type",
            width: "120px",
            textAlign: "center",
            type: "status",
            status: {
              syllabus: { text: "수업 개설 권한" },
              enrollment: { text: "수강신청 권한" },
              evaluation: { text: "평가 권한" },
            },
          },

          {
            text: "선생님",
            key: "isTeacherAllowed",
            width: "52px",
            textAlign: "center",
            type: "status",
            status: {
              false: { text: "N", color: "red" },
              true: { text: "Y", color: "green" },
            },
          },
          {
            text: "학생",
            key: "isStudentAllowed",
            width: "52px",
            textAlign: "center",
            type: "status",
            status: {
              false: { text: "N", color: "red" },
              true: { text: "Y", color: "green" },
            },
          },

          {
            text: "예외",
            key: "detail",
            type: "button",
            onClick: (e: any) => {
              setPermissionType(e.type);
              setIsLoadingPermissionData(true);
              setEditPopupActive(true);
            },
            width: "52px",
            textAlign: "center",
            btnStyle: {
              border: true,
              color: "var(--accent-1)",
              padding: "4px",
              round: true,
            },
          },
        ]}
      />

      {!isLoadingPermissionData && editPopupActive && (
        <Popup
          style={{ maxWidth: "600px", width: "100%" }}
          title={`${
            permissionType === "syllabus"
              ? "수업 개설"
              : permissionType === "enrollment"
              ? "수강신청"
              : "평가"
          } 권한 예외 목록`}
          setState={setEditPopupActive}
          closeBtn
          contentScroll
        >
          <div className={style.popup}>
            <Table
              type="object-array"
              data={permissionData?.exceptions || []}
              header={[
                {
                  text: "No",
                  type: "text",
                  key: "tableRowIndex",
                  width: "48px",
                  textAlign: "center",
                },
                {
                  text: "ID",
                  key: "userId",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "상태",
                  key: "isAllowed",
                  width: "120px",
                  textAlign: "center",
                  type: "status",
                  status: {
                    false: { text: "비허용", color: "red" },
                    true: { text: "허용", color: "green" },
                  },
                },
              ]}
            />
          </div>
        </Popup>
      )}
    </div>
  );
};

export default Permission;
