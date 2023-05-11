/**
 * @file Updated Evaluation Popup
 * @page 수정된 평가 정보 팝업
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
import style from "style/pages/courses/course.module.scss";

// components
import Divider from "components/divider/Divider";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import { useNavigate } from "react-router-dom";

type Props = {
  pid: string;
  changes: {
    student: string;
    studentId: string;
    studentName: string;
    label: string;
    before: string;
    after: string;
  }[];

  setPopupActive: any;
};

const CourseView = (props: Props) => {
  const navigate = useNavigate();

  return (
    <Popup
      setState={(e: boolean) => {
        navigate(`/courses/mentoring/${props.pid}`, {
          replace: true,
        });
        props.setPopupActive(e);
      }}
      title={"수정된 평가 항목"}
      closeBtn
      contentScroll
      style={{ borderRadius: "4px", width: "900px" }}
    >
      <div className={style.section}>
        <Table
          control
          type="object-array"
          data={props.changes}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "이름",
              key: "studentName",
              type: "text",
              textAlign: "center",
            },
            {
              text: "ID",
              key: "studentId",
              type: "text",
              textAlign: "center",
            },
            {
              text: "항목",
              key: "label",
              type: "text",
              textAlign: "center",
            },
            {
              text: "변경 전",
              key: "before",
              type: "text",
              textAlign: "center",
            },
            {
              text: "변경 후",
              key: "after",
              type: "text",
              textAlign: "center",
            },
          ]}
        />
      </div>
    </Popup>
  );
};

export default CourseView;
