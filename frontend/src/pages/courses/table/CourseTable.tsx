import Table, { TTableHeader } from "components/tableV2/Table";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

import { defaultHeaderList } from "./defaultHeaderList";
import _ from "lodash";

import ViewPopup from "../view/ViewPopup";
import StatusPopup from "../view/StatusPopup";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  defaultPageBy?: 0 | 10 | 50 | 100 | 200;
  data: any[];
  enrolledData?: any[];
  isMentor?: boolean;
  setIsLoading?: (val: boolean) => void;
  subjectLabels: string[];
  preHeaderList?: TTableHeader[];
  postHeaderList?: TTableHeader[];
  showStatus?: boolean;
  onClickDetail?: (e: any) => void;
};

const CourseTable = (props: Props) => {
  const { SyllabusAPI } = useAPIv2();
  const { currentUser } = useAuth();
  const [courseList, setCourseList] = useState<any[]>([]);
  const [headerList, setHeaderList] = useState<TTableHeader[]>([]);

  const [courseId, setCourseId] = useState<string | undefined>(undefined);
  const [statusPopupActive, setStatusPopupActive] = useState<boolean>(false);
  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);
  const navigate = useNavigate();

  const structuring = (data: any[], enrolledData?: any[]) => {
    return _.sortBy(
      data.map((syllabus: any) => {
        for (let idx = 0; idx < props.subjectLabels.length; idx++) {
          syllabus[props.subjectLabels[idx]] = syllabus.subject[idx];
        }
        syllabus.timeText = _.join(
          syllabus.time.map((timeBlock: any) => timeBlock.label),
          ", "
        );
        if (enrolledData) {
          const hasNoDuplicates = (arr1: any[], arr2: any[]): boolean => {
            console.log(arr1, arr2);
            return !arr1.some(value1 => arr2.some(value2 => value1 === value2.time));
          };

          syllabus.enrolled = hasNoDuplicates(syllabus.time, enrolledData);
        } else {
          syllabus.enrolled = true;
        }
        syllabus.mentorText = _.join(
          syllabus.teachers.map((teacher: any) => teacher.userName),
          ", "
        );
        syllabus.confirmed = true;
        for (let teacher of syllabus.teachers) {
          if (!teacher.confirmed) {
            syllabus.confirmed = false;
            break;
          }
        }

        const confirmedCnt = _.filter(syllabus.teachers, {
          confirmed: true,
        }).length;
        syllabus.confirmedStatus =
          confirmedCnt === 0
            ? "notConfirmed"
            : confirmedCnt === syllabus.teachers.length
            ? "fullyConfirmed"
            : "semiConfirmed";

        if (!syllabus.count_limit) {
          syllabus.count_limit = `${syllabus?.count || 0}/${syllabus.limit}`;
        }
        
        console.log("syllabus, ", syllabus);
        return syllabus;
      }),
      ["subject", "classTitle"]
    );
  };

  useEffect(() => {
    /* set dataList */
    setCourseList(structuring(props.data, props.enrolledData));

    /* set headerList */
    const subjectLabelHeaderList: TTableHeader[] = props.subjectLabels.map(
      (label: string) => {
        return {
          text: label,
          key: label,
          type: "text",
          textAlign: "center",
          wordBreak: "keep-all",
          width: "80px",
        };
      }
    );

    const postHeaderList = props.postHeaderList ?? [];
    if (props.showStatus) {
      postHeaderList.push({
        text: "상태",
        key: "confirmedStatus",
        width: "72px",
        textAlign: "center",
        type: "status",
        status: {
          notConfirmed: {
            text: "미승인",
            color: "red",
            onClick: (e) => {
              if (props.isMentor) {
                SyllabusAPI.UConfirmSyllabus({ params: { _id: e._id } })
                  .then(() => {
                    alert(SUCCESS_MESSAGE);
                    if (props.setIsLoading) {
                      props.setIsLoading(true);
                    }
                  })
                  .catch((err) => {
                    ALERT_ERROR(err);
                  });
              }
            },
          },
          fullyConfirmed: {
            text: "승인됨",
            color: "green",
            onClick: (e) => {
              if (props.isMentor) {
                if (e.count !== 0)
                  alert("수강신청한 학생이 있으면 승인을 취소할 수 없습니다.");
                else {
                  SyllabusAPI.UCancleConfirmSyllabus({ params: { _id: e._id } })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      if (props.setIsLoading) {
                        props.setIsLoading(true);
                      }
                    })
                    .catch((err) => {
                      ALERT_ERROR(err);
                    });
                }
              }
            },
          },
          semiConfirmed: {
            text: "승인중",
            color: "purple",
            onClick: (e: any) => {
              setCourseId(e._id);
              setStatusPopupActive(true);
            },
          },
        },
      });
    }
    /*postHeaderList.push({
      text: "자세히",
      key: "detail",
      type: "button",
      onClick: props.onClickDetail
        ? props.onClickDetail
        : (e: any) => {
            if(currentUser.auth === "manager"){
              navigate(`/courses/mentoring/${e._id}`);
            }else{
              setCourseId(e._id);
              setViewPopupActive(true);
            }
          },
      width: "72px",
      textAlign: "center",
      btnStyle: {
        border: true,
        color: "black",
        padding: "4px",
        round: true,
      },
    });*/

    setHeaderList([
      ...(props.preHeaderList ?? []),
      ...subjectLabelHeaderList,
      {
        text: "수업명",
        key: "classTitle",
        type: "text",
        textAlign: "center",
        wordBreak: "keep-all",
        width: "320px",
        cursor: "pointer",
        onClick: props.onClickDetail
          ? props.onClickDetail
          : (e: any) => {
          console.log(e)
            if(currentUser.auth === "manager"){
              navigate(`/courses/mentoring/${e._id}`);
            }else{
              setCourseId(e._id);
              setViewPopupActive(true);
            }
          },
      },
      ...defaultHeaderList,
      ...postHeaderList,
    ]);

    return () => {};
  }, [props.data]);

  return (
    <>
      <Table
        control
        defaultPageBy={props.defaultPageBy}
        type="object-array"
        data={courseList}
        header={headerList}
      />
      {statusPopupActive && courseId && (
        <StatusPopup
          course={courseId}
          setPopupActive={setStatusPopupActive}
          isMentor={props.isMentor}
          setIsLoading={props.setIsLoading}
        />
      )}
      {viewPopupActive && courseId && (
        <ViewPopup course={courseId} setPopupActive={setViewPopupActive} />
      )}
    </>
  );
};

export default CourseTable;
