import Table, { TTableHeader } from "components/tableV2/Table";
import { useEffect, useState } from "react";

import { defaultHeaderList } from "./defaultHeaderList";
import _ from "lodash";
import Popup from "components/popup/Popup";

import ViewPopup from "../view/ViewPopup";
import StatusPopup from "../view/StatusPopup";
import useApi from "hooks/useApi";

type Props = {
  defaultPageBy?: 0 | 10 | 50 | 100 | 200;
  data: any[];
  isMentor?: boolean;
  setIsLoading?: (val: boolean) => void;
  subjectLabels: string[];
  preHeaderList?: TTableHeader[];
  postHeaderList?: TTableHeader[];
  showStatus?: boolean;
  onClickDetail?: (e: any) => void;
};

const CourseTable = (props: Props) => {
  const { SyllabusApi } = useApi();
  const [courseList, setCourseList] = useState<any[]>([]);
  const [headerList, setHeaderList] = useState<TTableHeader[]>([]);

  const [courseId, setCourseId] = useState<string | undefined>(undefined);
  const [statusPopupActive, setStatusPopupActive] = useState<boolean>(false);
  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);

  const structuring = (data: any[]) => {
    return _.sortBy(
      data.map((syllabus: any) => {
        for (let idx = 0; idx < props.subjectLabels.length; idx++) {
          syllabus[props.subjectLabels[idx]] = syllabus.subject[idx];
        }
        syllabus.timeText = _.join(
          syllabus.time.map((timeBlock: any) => timeBlock.label),
          ", "
        );
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

        return syllabus;
      }),
      ["subject", "classTitle"]
    );
  };

  useEffect(() => {
    /* set dataList */
    setCourseList(structuring(props.data));

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
                SyllabusApi.ConfirmSyllabus(e._id)
                  .then(() => {
                    alert(SUCCESS_MESSAGE);
                    if (props.setIsLoading) {
                      props.setIsLoading(true);
                    }
                  })
                  .catch((err) => {
                    alert("failed to confirm");
                  });
              }
            },
          },
          fullyConfirmed: {
            text: "승인됨",
            color: "green",
            onClick: (e) => {
              if (props.isMentor) {
                if (e.count_limit[0] !== "0")
                  alert("수강신청한 학생이 있으면 승인을 취소할 수 없습니다.");
                else {
                  SyllabusApi.UnconfirmSyllabus(e._id)
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      if (props.setIsLoading) {
                        props.setIsLoading(true);
                      }
                    })
                    .catch((err) => {
                      alert("failed to unconfirm");
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
    postHeaderList.push({
      text: "자세히",
      key: "detail",
      type: "button",
      onClick: props.onClickDetail
        ? props.onClickDetail
        : (e: any) => {
            setCourseId(e._id);
            setViewPopupActive(true);
          },
      width: "72px",
      textAlign: "center",
      btnStyle: {
        border: true,
        color: "black",
        padding: "4px",
        round: true,
      },
    });

    setHeaderList([
      ...(props.preHeaderList ?? []),
      ...subjectLabelHeaderList,
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
