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
import useDatabase from "hooks/useDatabase";

// components
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import useApi from "hooks/useApi";
import { useAuth } from "contexts/authContext";

type Props = {
  setPopupActive: any;
  course: string;
  isMentor?: boolean;
  setIsLoading?: (value: boolean) => void;
};

const StatusPopup = (props: Props) => {
  const { currentUser } = useAuth();
  const { SyllabusApi } = useApi();

  const [courseData, setCourseData] = useState<any>();

  async function getCourse(_id: string) {
    const res = await SyllabusApi.RSyllabus(props.course);
    return res;
  }

  useEffect(() => {
    getCourse(props.course).then((res) => {
      setCourseData(res);
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
              text: "멘토 이름",
              key: "userName",
              type: "text",
              textAlign: "center",
            },
            {
              text: "멘토 ID",
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
                      SyllabusApi.ConfirmSyllabus(props.course)
                        .then(() => {
                          alert(SUCCESS_MESSAGE);
                          if (props.setIsLoading) {
                            e.confirmed = true;
                            props.setIsLoading(true);
                          }
                        })
                        .catch((err) => {
                          alert("failed to confirm");
                        });
                    }
                  },
                },
                true: {
                  text: "승인됨",
                  color: "green",
                  onClick: (e) => {
                    if (props.isMentor && e._id === currentUser._id) {
                      SyllabusApi.UnconfirmSyllabus(props.course)
                        .then(() => {
                          alert(SUCCESS_MESSAGE);
                          e.confirmed = false;
                          if (props.setIsLoading) {
                            props.setIsLoading(true);
                          }
                        })
                        .catch((err) => {
                          console.error(err);
                          alert("failed to unconfirm");
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
