import Table, { TTableHeader } from "components/tableV2/Table";
import { useEffect, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";

import { defaultHeaderList } from "./defaultHeaderList";
import _ from "lodash";

import ViewPopup from "../view/ViewPopup";
import StatusPopup from "../view/StatusPopup";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import {
  courseTodosCacheKey,
  invalidateCourseTodosCache,
} from "../courseTodosCache";
import badgeStyle from "../courseTodoBadge.module.scss";

const SUCCESS_MESSAGE = "완료되었습니다.";

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
  /** Hide Table built-in search while keeping pagination controls */
  hideSearch?: boolean;
  /** 외부 검색(부모 필터) — 테이블 헤더에 표시 */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** When set, only these data column keys are shown (preHeader always kept) */
  visibleKeys?: Set<string>;
  /** syllabusId → 「평가」 칩 라벨. 승인은 상태 열 담당 */
  evaluationBySyllabusId?: Record<string, "없음" | "대기" | "평가중" | "완료">;
};

const CourseTable = (props: Props) => {
  const { SyllabusAPI } = useAPIv2();
  const { currentUser, currentSchool, currentRegistration, currentSeason } =
    useAuth();
  const [courseList, setCourseList] = useState<any[]>([]);
  const [headerList, setHeaderList] = useState<TTableHeader[]>([]);

  const [courseId, setCourseId] = useState<string | undefined>(undefined);
  const [statusPopupActive, setStatusPopupActive] = useState<boolean>(false);
  const [viewPopupActive, setViewPopupActive] = useState<boolean>(false);
  const navigate = useAppNavigate();

  const invalidateTodos = () => {
    const seasonId =
      currentRegistration?.season || currentSeason?._id || undefined;
    if (currentSchool?._id) {
      invalidateCourseTodosCache(
        courseTodosCacheKey(currentSchool._id, seasonId)
      );
    }
  };

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

        if (!syllabus.count_limit) {
          syllabus.count_limit = `${syllabus?.count || 0}/${syllabus.limit}`;
        }

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
                SyllabusAPI.UConfirmSyllabus({ params: { _id: e._id } })
                  .then(() => {
                    alert(SUCCESS_MESSAGE);
                    invalidateTodos();
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
                      invalidateTodos();
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

    const classTitleHeader: TTableHeader = {
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
            navigate(`/courses/mentoring/${e._id}`);
          },
    };

    const evalMap = props.evaluationBySyllabusId;
    const evaluationHeader: TTableHeader | null = evalMap
      ? {
          text: "평가",
          key: "evaluationTodo",
          type: "text",
          width: "72px",
          textAlign: "center",
          render: (_value: any, row: any) => {
            const syllabusKey = String(row.syllabus || row._id || "");
            const label = evalMap[syllabusKey];
            if (!label) return null;
            const toneClass =
              label === "평가중"
                ? badgeStyle.evalChipInProgress
                : label === "완료"
                  ? badgeStyle.evalChipDone
                  : label === "없음"
                    ? badgeStyle.evalChipNone
                    : badgeStyle.evalChipWaiting;
            return (
              <span
                className={`${badgeStyle.evalChip} ${toneClass}`}
                title={`평가 ${label}`}
                aria-label={`평가 ${label}`}
              >
                {label}
              </span>
            );
          },
        }
      : null;

    const alwaysVisibleKeys = new Set(["confirmedStatus", "evaluationTodo"]);
    const dataHeaders = [
      ...subjectLabelHeaderList,
      classTitleHeader,
      ...defaultHeaderList,
      ...(evaluationHeader ? [evaluationHeader] : []),
      ...postHeaderList,
    ].filter((h) => {
      if (!props.visibleKeys || !h.key) return true;
      if (alwaysVisibleKeys.has(h.key)) return true;
      return props.visibleKeys.has(h.key);
    });

    setHeaderList([...(props.preHeaderList ?? []), ...dataHeaders]);

    return () => {};
  }, [
    props.data,
    props.subjectLabels,
    props.visibleKeys,
    props.preHeaderList,
    props.evaluationBySyllabusId,
    props.showStatus,
  ]);

  return (
    <>
      <Table
        control
        hideSearch={props.hideSearch && !props.onSearchChange}
        searchValue={props.searchValue}
        onSearchChange={props.onSearchChange}
        searchPlaceholder={props.searchPlaceholder}
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
