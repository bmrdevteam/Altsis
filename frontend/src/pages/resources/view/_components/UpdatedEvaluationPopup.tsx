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
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import Button from "components/button/Button";

type Props = {
  pid: string;
  changes: {
    student: string;
    studentId: string;
    studentName: string;
    labels: string[];
    before: string[];
    after: string[];
  }[];

  setPopupActive: any;
};

const Index = (props: Props) => {
  const { currentSeason } = useAuth();
  const navigate = useNavigate();
  const [changes, setChanges] = useState<any[]>([]);
  const [formEvaluationHeader, setFormEvaluationHeader] = useState<any[]>([]);

  useEffect(() => {
    const changes = [];
    for (let _change of props.changes) {
      const before: { [key: string]: string } = {
        type: "before",
        studentId: _change.studentId,
        studentName: _change.studentName,
      };
      const after: { [key: string]: string } = {
        type: "after",
        studentId: _change.studentId,
        studentName: _change.studentName,
      };
      for (let i = 0; i < _change.labels.length; i++) {
        before["evaluation." + _change.labels[i]] = _change.before[i];
        after["evaluation." + _change.labels[i]] = _change.after[i];
      }
      changes.push(before);
      changes.push(after);
    }
    setChanges(changes);

    return () => {};
  }, []);

  useEffect(() => {
    if (currentSeason.formEvaluation) {
      const formEvaluationHeader: { [key: string]: string }[] = [];
      currentSeason.formEvaluation.forEach((val: any) => {
        formEvaluationHeader.push({
          text: val.label,
          key: "evaluation." + val.label,
          type: "text",
          whiteSpace: "pre-wrap",
        });
      });
      setFormEvaluationHeader(formEvaluationHeader);
    }

    return () => {};
  }, [currentSeason]);

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
      style={{ width: "900px" }}
      footer={
        <Button
          type="ghost"
          onClick={() => {
            navigate(`/courses/mentoring/${props.pid}`, {
              replace: true,
            });
            props.setPopupActive(false);
          }}
        >
          확인
        </Button>
      }
    >
      <div className={style.section}>
        <Table
          control
          type="object-array"
          data={changes}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "유형",
              key: "type",
              fontSize: "12px",
              fontWeight: "600",
              type: "status",
              status: {
                before: {
                  text: "수정 전",
                  color: "#B33F00",
                },
                after: {
                  text: "수정 후",
                  color: "#8657ff",
                },
              },
              width: "80px",
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
            ...formEvaluationHeader,
          ]}
        />
      </div>
    </Popup>
  );
};

export default Index;
