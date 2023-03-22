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
import useApi from "hooks/useApi";

// components
import Table from "components/tableV2/Table";

import { unzipPermission, zipPermission } from "functions/functions";

import Edit from "./tab/Edit";

type Props = {
  _id: string;
};

type Permission = {
  teacher: boolean;
  student: boolean;
  exceptions: any[];
};
const defaultPermission: Permission = {
  teacher: false,
  student: false,
  exceptions: [],
};

const Permission = (props: Props) => {
  const { SeasonApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);

  const [permissionSyllabusParsed, setPermissionSyllabusParsed] =
    useState<Permission>(defaultPermission);
  const [permissionEnrollmentParsed, setPermissionEnrollmentParsed] =
    useState<Permission>(defaultPermission);
  const [permissionEvaluationParsed, setPermissionEvaluationParsed] =
    useState<Permission>(defaultPermission);
  const [type, setType] = useState<"syllabus" | "enrollment" | "evaluation">(
    "syllabus"
  );

  const getPermission = (type: string) => {
    if (type === "syllabus") return permissionSyllabusParsed;
    else if (type === "enrollment") return permissionEnrollmentParsed;
    else if (type === "evaluation") return permissionEvaluationParsed;
    return defaultPermission;
  };

  useEffect(() => {
    if (isLoading) {
      SeasonApi.RSeason(props._id)
        .then((res) => {
          setPermissionSyllabusParsed(
            unzipPermission(res?.permissionSyllabus ?? [])
          );
          setPermissionEnrollmentParsed(
            unzipPermission(res?.permissionEnrollment ?? [])
          );
          setPermissionEvaluationParsed(
            unzipPermission(res?.permissionEvaluation ?? [])
          );
        })
        .then(() => {
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  return (
    <div style={{ marginTop: "24px" }}>
      <Table
        type="object-array"
        data={[
          { type: "syllabus", ...permissionSyllabusParsed },
          { type: "enrollment", ...permissionEnrollmentParsed },
          { type: "evaluation", ...permissionEvaluationParsed },
        ]}
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
            key: "teacher",
            width: "52px",
            textAlign: "center",
            type: "status",
            status: {
              false: {
                text: "N",
                color: "red",
                onClick: (e: any) => {
                  SeasonApi.USeasonPermission({
                    _id: props._id,
                    type: e.type,
                    data: zipPermission({
                      ...getPermission(e.type),
                      teacher: true,
                    }),
                  })
                    .then((res: any) => {
                      setIsLoading(true);
                      alert("success");
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                },
              },
              true: {
                text: "Y",
                color: "green",
                onClick: (e: any) => {
                  SeasonApi.USeasonPermission({
                    _id: props._id,
                    type: e.type,
                    data: zipPermission({
                      ...getPermission(e.type),
                      teacher: false,
                    }),
                  })
                    .then((res: any) => {
                      setIsLoading(true);
                      alert("success");
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                },
              },
            },
          },
          {
            text: "학생",
            key: "student",
            width: "52px",
            textAlign: "center",
            type: "status",
            status: {
              false: {
                text: "N",
                color: "red",
                onClick: (e: any) => {
                  SeasonApi.USeasonPermission({
                    _id: props._id,
                    type: e.type,
                    data: zipPermission({
                      ...getPermission(e.type),
                      student: true,
                    }),
                  })
                    .then((res: any) => {
                      setIsLoading(true);
                      alert("success");
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                },
              },
              true: {
                text: "Y",
                color: "green",
                onClick: (e: any) => {
                  SeasonApi.USeasonPermission({
                    _id: props._id,
                    type: e.type,
                    data: zipPermission({
                      ...getPermission(e.type),
                      student: false,
                    }),
                  })
                    .then((res: any) => {
                      setIsLoading(true);
                      alert("success");
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                },
              },
            },
          },
          {
            text: "설정",
            key: "detail",
            type: "button",
            onClick: (e: any) => {
              setType(e.type);
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
      {editPopupActive && (
        <Edit
          setPopupActive={setEditPopupActive}
          _id={props._id}
          type={type}
          setIsLoading={setIsLoading}
        />
      )}
    </div>
  );
};

export default Permission;
