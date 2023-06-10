/**
 * @file Course Paste Popup
 * @page 수업 개설 뷰 - 강의계획서 복사 팝업
 *
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
import { useAuth } from "contexts/authContext";

import style from "style/pages/courses/course.module.scss";

// components
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import _ from "lodash";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  setPopupActive: any;
  pasteFunc: any;
};

const Index = (props: Props) => {
  const { currentUser } = useAuth();
  const { SyllabusAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syllabuses, setSyllabuses] = useState<any[]>([]);

  useEffect(() => {
    if (isLoading) {
      SyllabusAPI.RSyllabuses({ query: { user: currentUser?._id } })
        .then(({ syllabuses }) => {
          setSyllabuses(
            _.orderBy(
              syllabuses,
              ["year", "term", "subject", "classTitle"],
              ["desc", "desc", "asc", "asc"]
            )
          );
        })
        .then(() => setIsLoading(false));
    }

    return () => {};
  }, [isLoading]);

  return (
    <Popup
      setState={props.setPopupActive}
      title={"복사할 강의계획서 선택"}
      closeBtn
      contentScroll
      style={{ width: "900px" }}
    >
      <div className={style.section}>
        <Table
          control
          defaultPageBy={10}
          data={syllabuses.map((syllabus: any) => {
            return { ...syllabus, subject_2: _.join(syllabus.subject, "/ ") };
          })}
          type="object-array"
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "학년도",
              key: "year",
              type: "text",
              textAlign: "center",
            },
            {
              text: "학기",
              key: "term",
              type: "text",
              textAlign: "center",
            },
            {
              text: "교과목",
              key: "subject_2",
              type: "text",
            },
            {
              text: "수업명",
              key: "classTitle",
              type: "text",
              textAlign: "center",
            },
            {
              text: "선택",
              key: "select",
              type: "button",
              onClick: (e: any) => {
                props.pasteFunc(e._id);
                props.setPopupActive(false);
              },
              width: "80px",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "black",
                padding: "4px",
                round: true,
              },
            },
          ]}
        />
      </div>
    </Popup>
  );
};

export default Index;
