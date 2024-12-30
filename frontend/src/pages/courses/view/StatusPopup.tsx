/**
 * @file Course View Popup
 * @page 수업 상세페이지 팝업
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
import { useEffect, useState } from "react";

// components
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  setPopupActive: any;
  course: string;
  isMentor?: boolean;
  setIsLoading?: (value: boolean) => void;
};

const StatusPopup = (props: Props) => {
  const { currentUser } = useAuth();
  const { SyllabusAPI } = useAPIv2();

  const [courseData, setCourseData] = useState<any>();

  async function getCourse(_id: string) {
    try {
      const { syllabus } = await SyllabusAPI.RSyllabus({
        params: { _id: props.course },
      });
      return syllabus;
    } catch (err) {
      ALERT_ERROR(err);
    }
  }

  useEffect(() => {
    getCourse(props.course).then((syllabus) => {
      setCourseData(syllabus);
    });
    return () => {};
  }, []);

  return (
    courseData && (
      <Popup setState={props.setPopupActive} title="승인 상태" closeBtn>
        <Table
          type="object-array"
          data={courseData?.teachers || []}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },

            {
              text: "지도교사 이름",
              key: "userName",
              type: "text",
              textAlign: "center",
            },
            {
              text: "지도교사 ID",
              key: "userId",
              type: "text",
              textAlign: "center",
            },

            {
              text: "상태",
              key: "confirmed",
              width: "120px",
              textAlign: "center",
              type: "status",
              status: {
                false: {
                  text: "미승인",
                  color: "red",
                  onClick: (e) => {
                    if (props.isMentor && e._id === currentUser._id) {
                      SyllabusAPI.UConfirmSyllabus({
                        params: { _id: props.course },
                      })
                        .then(() => {
                          alert(SUCCESS_MESSAGE);
                          if (props.setIsLoading) {
                            e.confirmed = true;
                            props.setIsLoading(true);
                          }
                        })
                        .catch((err) => {
                          ALERT_ERROR(err);
                        });
                    }
                  },
                },
                true: {
                  text: "승인됨",
                  color: "green",
                  onClick: (e) => {
                    if (props.isMentor && e._id === currentUser._id) {
                      SyllabusAPI.UCancleConfirmSyllabus({
                        params: { _id: props.course },
                      })
                        .then(() => {
                          alert(SUCCESS_MESSAGE);
                          e.confirmed = false;
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
              },
            },
          ]}
        />
      </Popup>
    )
  );
};

export default StatusPopup;
