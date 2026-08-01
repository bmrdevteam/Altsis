/**
 * @file Course Enroll Page
 * @page 수강 신청 페이지
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
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";

import style from "style/pages/enrollment.module.scss";

import _ from "lodash";

import CourseTable from "./table/CourseTable";
import EnrollFilterBar from "./EnrollFilterBar";
import { useCourseListFilter } from "./useCourseListFilter";
import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";
import { Socket, io } from "socket.io-client";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const CourseEnroll = (props: Props) => {
  const navigate = useAppNavigate();
  const { SyllabusAPI, EnrollmentAPI } = useAPIv2();

  const { currentSeason, currentUser, currentRegistration } = useAuth();

  const [courseList, setCourseList] = useState<any[]>([]);
  const [isLoadingCourseList, setIsLoadingCourseList] = useState<boolean>(true);
  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);
  const [isLoadingEnrolledCourseList, setIsLoadingEnrolledCourseList] = useState<boolean>(true);
  const [updatedCourseList, setUpdatedCourseList] = useState<any[]>([]);
  const [isLoadingUpdatedCourseList, setIsLoadingUpdatedCourseList] = useState<boolean>(true);

  const [socket, setSocket] = useState<Socket>();
  const [taskIdx, setTaskIdx] = useState<number | undefined>();
  const [waitingOrder, setWaitingOrder] = useState<number | undefined>();
  const [waitingBehind, setWaitingBehind] = useState<number | undefined>();
  const [waitingRatio, setWaitingRatio] = useState<number | undefined>();

  const [isLoadingWaitingOrder, setIsLoadingWaitingOrder] =
    useState<boolean>(false);
  const [isActiveSendingPopup, activateSendingPopup] = useState<boolean>(false);
  const [isActiveWaitingPopup, activateWaitingPopup] = useState<boolean>(false);

  const subjectLabels = currentSeason?.subjects?.label ?? [];
  const {
    keyword,
    setKeyword,
    columnOptions,
    effectiveVisibleColumns,
    handleColumnToggle,
    handleShowAll,
    handleFilterReset,
    onlyAvailable,
    handleOnlyAvailableChange,
    filterCourses,
  } = useCourseListFilter({
    storageKey: "enroll",
    subjectLabels,
    enableOnlyAvailable: true,
  });

  async function getCourseList() {
    try {
      const { syllabuses } = await SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration?.season,
          confirmed: true,
        },
      });
      return syllabuses;
    } catch (err) {
      ALERT_ERROR(err);
    }
  }

  async function getEnrolledCourseList() {
    const { enrollments: myEnrollments, syllabuses: mySyllabuses } =
      await SyllabusAPI.RSyllabuses({
        query: {
          season: currentRegistration?.season,
          student: currentUser?._id,
        },
      });

    if (myEnrollments.length === 0) return [];

    const syllabuses = [];
    // enrollments to syllabus
    for (let syllabus of mySyllabuses) {
      const eIdx = _.findIndex(myEnrollments, { syllabus: syllabus._id });
      if (eIdx !== -1) {
        syllabuses.push({
          ...myEnrollments[eIdx],
          _id: syllabus._id,
          enrollment: myEnrollments[eIdx]._id,
          count_limit: `${syllabus.count}/${syllabus.limit}`,
        });
      }
    }
    return syllabuses;
  }

  const maxCredit = currentSeason?.maxCredit ?? 0;
  const minCredit = currentSeason?.minCredit ?? 0;
  const enrolledTotalPoint = enrolledCourseList.reduce(
    (acc, cur) => acc + (Number(cur.point) || 0),
    0
  );

  const getUpdatedCourseList = () => {
    // 시간표 중복 확인
    const timeLabelsEnrolledCourseList = enrolledCourseList.flatMap(item =>
      item.time.map((t: any) => t.label)
    );
  
    // 수강 중인 강의의 classId 목록
    const classIdEnrolledCourseList = enrolledCourseList.map(item => item._id);
  
    // 수강 중인 강의의 classId와 enrollment 목록
    const enrollmentIdEnrolledCourseList = enrolledCourseList.map(item => ({
      classId: item._id,
      enrollment: item.enrollment,
    }));
  
    return courseList.map(item => {
      // 시간표 중복 확인
      const hasConflict = item.time.some((t: any) =>
        timeLabelsEnrolledCourseList.includes(t.label)
      );
  
      // 이미 수강 중인 강의인지 확인
      const isEnrolled = classIdEnrolledCourseList.includes(item._id);
  
      // 정원이 다 찼는지 확인
      const isFull = item.limit > 0 ? item.count >= item.limit : false;

      // 최대 신청 학점 초과 여부
      const isCreditFull =
        maxCredit > 0 &&
        enrolledTotalPoint + (Number(item.point) || 0) > maxCredit;
  
      // 일치하는 enrollment 값 추가
      const enrollmentMatch = enrollmentIdEnrolledCourseList.find(
        enrolled => enrolled.classId === item._id
      );
  
      let returnItem = { ...item, enrollType: "enroll" };

      if (isCreditFull) {
        returnItem = { ...item, enrollType: "creditFull" };
      }
      if (isFull) {
        returnItem = { ...item, enrollType: "full" };
      }
      if (hasConflict) {
        returnItem = { ...item, enrollType: "duplication" };
      }
      if (isEnrolled) {
        returnItem = { ...item, enrollType: "enrolled" };
      }
  
      if (enrollmentMatch) {
        returnItem = { ...returnItem, enrollment: enrollmentMatch.enrollment };
      }
  
      return returnItem;
    });
  };

  useEffect(() => {
    if (!currentRegistration) {
      alert("등록된 학기가 없습니다.");
      navigate("/");
    } else if (!currentRegistration?.permissionEnrollmentV2) {
      alert("수강신청 권한이 없습니다.");
      navigate("/courses");
    } else {
      setIsLoadingCourseList(true);
      setIsLoadingEnrolledCourseList(true);
    }
  }, [currentRegistration]);

  useEffect(() => {
    if (isLoadingCourseList) {
      getCourseList().then((res: any) => {
        setCourseList(res);
        setIsLoadingCourseList(false);
      });
    }
  }, [isLoadingCourseList, currentSeason]);

  useEffect(() => {
    if (isLoadingEnrolledCourseList) {
      getEnrolledCourseList().then((res: any) => {
        setEnrolledCourseList(res);
        setIsLoadingEnrolledCourseList(false);
      });
    }
  } , [isLoadingEnrolledCourseList, currentSeason]);

  useEffect(() => {
    if (isLoadingUpdatedCourseList) {
      setUpdatedCourseList(getUpdatedCourseList());
      setIsLoadingUpdatedCourseList(false);
    }
  }, [isLoadingUpdatedCourseList, currentSeason, enrolledCourseList, courseList]);

  useEffect(() => {
    if (enrolledCourseList.length >= 0 && courseList.length > 0) {
      setIsLoadingUpdatedCourseList(true);
    }
  }, [enrolledCourseList, courseList]);

  useEffect(() => {
    const socket = io(`${process.env.REACT_APP_SERVER_URL}`, {
      path: "/io/enrollment",
      withCredentials: true,
    });

    socket.on("connect", () => {
      setSocket(socket);
    });

    socket.on(
      "responseWaitingOrder",
      (data: {
        waitingOrder: number;
        waitingBehind: number;
        taskIdx?: number;
      }) => {
        const waitingRatio =
          (data.waitingBehind + 1) /
          (data.waitingBehind + data.waitingOrder + 1);
        if (data.waitingOrder > 10 && waitingRatio < 1) {
          setWaitingOrder(data.waitingOrder);
          setWaitingBehind(data.waitingBehind);
          setWaitingRatio(waitingRatio);
          if (data.taskIdx) {
            setTaskIdx(data.taskIdx);
          }
          if (!isActiveWaitingPopup) {
            activateWaitingPopup(true);
          }
          setIsLoadingWaitingOrder(true);
        } else {
          activateWaitingPopup(false);
          setTaskIdx(undefined);
          setWaitingOrder(undefined);
          setWaitingBehind(undefined);
          setWaitingRatio(undefined);
        }
      }
    );

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (isLoadingWaitingOrder && socket && taskIdx) {
      setTimeout(() => {
        socket.emit("requestWaitingOrder", {
          taskIdx,
        });
      }, 2000);
      setIsLoadingWaitingOrder(false);
    }
    return () => {};
  }, [isLoadingWaitingOrder, socket, taskIdx]);

  const isOverMaxCredit = maxCredit > 0 && enrolledTotalPoint > maxCredit;
  const creditSummaryItems: { label: string; value: string; warning?: boolean }[] =
    [];
  if (maxCredit > 0 || minCredit > 0) {
    creditSummaryItems.push({
      label: "신청 학점",
      value: `${enrolledTotalPoint}`,
      warning: isOverMaxCredit,
    });
    if (maxCredit > 0) {
      creditSummaryItems.push({
        label: "최대",
        value: `${maxCredit}`,
        warning: isOverMaxCredit,
      });
    }
    if (minCredit > 0) {
      creditSummaryItems.push({
        label: "최소",
        value: `${minCredit}`,
      });
    }
  }

  const availableCount = updatedCourseList.filter(
    (c) => c.enrollType === "enroll"
  ).length;

  const displayedCourseList = filterCourses(
    updatedCourseList,
    (course) => course.enrollType === "enroll"
  );

  return (
    <>
      <div className={style.section}>
        <div className={style.title}>수강 신청</div>
        {creditSummaryItems.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div className={style.summary_grid}>
              {creditSummaryItems.map((item) => (
                <div
                  className={`${style.summary_item}${
                    item.warning ? ` ${style.warning}` : ""
                  }`}
                  key={item.label}
                >
                  <span className={style.summary_label}>{item.label}</span>
                  <span className={style.summary_value}>{item.value}</span>
                </div>
              ))}
            </div>
            {isOverMaxCredit && (
              <div className={style.summary_warning}>
                최대 신청 학점({maxCredit})을 초과했습니다. 일부 수업을
                취소해주세요.
              </div>
            )}
          </div>
        )}
        <EnrollFilterBar
          keyword={keyword}
          columns={columnOptions}
          visibleKeys={effectiveVisibleColumns}
          onToggleColumn={handleColumnToggle}
          onShowAll={handleShowAll}
          onReset={handleFilterReset}
          showOnlyAvailable
          onlyAvailable={onlyAvailable}
          onOnlyAvailableChange={handleOnlyAvailableChange}
          availableCount={availableCount}
          totalCount={updatedCourseList.length}
          ariaLabel="수강신청 보기 설정"
        />
        {!isLoadingCourseList ? (
          <CourseTable
            data={displayedCourseList}
            searchValue={keyword}
            onSearchChange={setKeyword}
            visibleKeys={effectiveVisibleColumns}
            subjectLabels={subjectLabels}
            preHeaderList={[
              {
                text: "신청",
                key: "enrollType",
                width: "72px",
                textAlign: "center",
                type: "status",
                status: {
                  enroll: {
                    text: "신청",
                    color: "green",
                    onClick: (e: any) => {
                      activateSendingPopup(true);
                      EnrollmentAPI.CEnrollment({
                        data: {
                          syllabus: e._id,
                          registration: currentRegistration?._id,
                          socketId: socket?.id,
                        },
                      })
                        .then(() => {
                          alert(SUCCESS_MESSAGE);
                          setIsLoadingCourseList(true);
                          setIsLoadingEnrolledCourseList(true);
                        })
                        .catch((err) => {
                          ALERT_ERROR(err);
                        })
                        .finally(() => {
                          activateSendingPopup(false);
                        });
                    },
                  },
                  duplication: {
                    text: "중복",
                    color: "purple",
                    onClick: (e: any) => {
                      alert("중복된 시간표가 있습니다.");
                    },
                  },
                  enrolled: {
                    text: "취소",
                    color: "red",
                    onClick: (e: any) => {
                      EnrollmentAPI.DEnrollment({ params: { _id: e.enrollment } })
                        .then(() => {
                          alert(SUCCESS_MESSAGE);
                          setIsLoadingCourseList(true);
                          setIsLoadingEnrolledCourseList(true);
                        })
                        .catch((err) => {
                          ALERT_ERROR(err);
                        });
                    },
                  },
                  full: {
                    text: "마감",
                    color: "blue",
                    onClick: (e: any) => {
                      alert("정원이 다 찼습니다.");
                    },
                  },
                  creditFull: {
                    text: "학점초과",
                    color: "blue",
                    onClick: () => {
                      alert("최대 신청 학점을 초과했습니다.");
                    },
                  },
                },
              }
            ]}
          />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>

      {isActiveSendingPopup && !isActiveWaitingPopup && (
        <Popup setState={() => {}}>
          <div>
            <Loading text="요청중" />
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              요청을 보내는 중입니다
            </div>
          </div>
        </Popup>
      )}
      {isActiveWaitingPopup && (
        <Popup setState={() => {}}>
          <div>
            <p>수강신청 대기 중입니다.</p>
            <Progress
              value={waitingRatio ?? 0}
              style={{ margin: "12px 0px" }}
            />
            <p>
              앞에 {waitingOrder ?? 0}명, 뒤에 {waitingBehind ?? 0}명의 대기자가
              있습니다. <br />
              재접속하시면 대기시간이 더 길어집니다.
            </p>
          </div>
        </Popup>
      )}
    </>
  );
};

export default CourseEnroll;
