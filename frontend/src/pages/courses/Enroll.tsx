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
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useApi from "hooks/useApi";

import style from "style/pages/enrollment.module.scss";

// Navigation Bar
import Navbar from "layout/navbar/Navbar";

// components
import Divider from "components/divider/Divider";

import _ from "lodash";

import CourseTable from "./table/CourseTable";
import Loading from "components/loading/Loading";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";
import { Socket, io } from "socket.io-client";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const CourseEnroll = (props: Props) => {
  const navigate = useNavigate();
  const { EnrollmentApi } = useApi();
  const { SyllabusAPI } = useAPIv2();

  const { currentSeason, currentUser, currentRegistration } = useAuth();

  const [isLoadingCourseList, setIsLoadingCourseList] = useState<boolean>(true);
  const [courseList, setCourseList] = useState<any[]>([]);

  const [isLoadingEnrolledCourseList, setIsLoadingEnrolledCourseList] =
    useState<boolean>(true);
  const [enrolledCourseList, setEnrolledCourseList] = useState<any[]>([]);

  const [socket, setSocket] = useState<Socket>();
  const [taskIdx, setTaskIdx] = useState<number | undefined>();
  const [waitingOrder, setWaitingOrder] = useState<number | undefined>();
  const [waitingBehind, setWaitingBehind] = useState<number | undefined>();
  const [waitingRatio, setWaitingRatio] = useState<number | undefined>();

  const [isLoadingWaitingOrder, setIsLoadingWaitingOrder] =
    useState<boolean>(false);
  const [isActiveSendingPopup, activateSendingPopup] = useState<boolean>(false);
  const [isActiveWaitingPopup, activateWaitingPopup] = useState<boolean>(false);

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
    const myEnrollments = await EnrollmentApi.REnrolllments({
      season: currentRegistration?.season,
      student: currentUser?._id,
    });

    if (myEnrollments.length === 0) return [];

    const sylEnrollments = await EnrollmentApi.REnrolllments({
      syllabuses: myEnrollments.map((e: any) => e.syllabus),
    });

    const cnt = _.countBy(
      sylEnrollments.map((enrollment: any) => enrollment.syllabus)
    );

    // enrollments to syllabus
    const syllabuses = myEnrollments.map((e: any) => {
      return {
        ...e,
        enrollment: e._id,
        _id: e.syllabus,
        count_limit: `${cnt[e.syllabus] || 0}/${e.limit}`,
      };
    });

    return syllabuses;
  }

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
  }, [isLoadingCourseList]);

  useEffect(() => {
    if (isLoadingEnrolledCourseList) {
      getEnrolledCourseList().then((res: any) => {
        setEnrolledCourseList(res);
        setIsLoadingEnrolledCourseList(false);
      });
    }
  }, [isLoadingEnrolledCourseList]);

  useEffect(() => {
    const socket = io(`${process.env.REACT_APP_SERVER_URL}`, {
      path: "/io/enrollment",
      withCredentials: true,
    });

    socket.on("connect", () => {
      //console.log("socket is connected: ", socket.id);
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

        // console.log(data);
        // console.log({ waitingRatio });

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
        // console.log("requestWaitingOrder");
        socket.emit("requestWaitingOrder", {
          taskIdx,
        });
      }, 2000);
      setIsLoadingWaitingOrder(false);
    }
    return () => {};
  }, [isLoadingWaitingOrder, socket, taskIdx]);

  return (
    <>
      <Navbar />
      <div className={style.section}>
        <div className={style.title}>수강신청</div>
        {!isLoadingCourseList ? (
          <CourseTable
            data={courseList}
            subjectLabels={currentSeason?.subjects?.label ?? []}
            preHeaderList={[
              {
                text: "신청",
                key: "enroll",
                type: "button",
                onClick: (e: any) => {
                  activateSendingPopup(true);
                  EnrollmentApi.CEnrollment({
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
                      alert(err.response.data.message);
                    })
                    .finally(() => {
                      activateSendingPopup(false);
                    });
                },
                width: "72px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "green",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
      <div style={{ marginTop: "24px", marginBottom: "24px" }}>
        <Divider />
      </div>
      <div className={style.section}>
        <div className={style.title}>수강 현황</div>
        {!isLoadingEnrolledCourseList ? (
          <CourseTable
            data={enrolledCourseList}
            subjectLabels={currentSeason?.subjects?.label ?? []}
            preHeaderList={[
              {
                text: "취소",
                key: "cancel",
                type: "button",
                onClick: (e: any) => {
                  EnrollmentApi.DEnrollment(e.enrollment)
                    .then(() => {
                      alert(SUCCESS_MESSAGE);
                      setIsLoadingCourseList(true);
                      setIsLoadingEnrolledCourseList(true);
                    })
                    .catch((err) => {
                      alert(err.response.data.message);
                    });
                },
                width: "72px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "red",
                  padding: "4px",
                  round: true,
                },
              },
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
