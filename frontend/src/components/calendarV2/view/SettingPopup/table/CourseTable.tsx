import Table, { TTableHeader } from "components/tableV2/Table";
import { useEffect, useState } from "react";

import _ from "lodash";

import ViewPopup from "./ViewPopup";

type Props = {
  data: any[];
  subjectLabels: string[];
  onChange: (e: any) => Promise<void>;
};

const CourseTable = (props: Props) => {
  const [courseList, setCourseList] = useState<any[]>([]);
  const [headerList, setHeaderList] = useState<TTableHeader[]>([]);

  const [courseId, setCourseId] = useState<string | undefined>(undefined);
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

    setHeaderList([
      {
        text: "checkbox",
        type: "checkbox",
        key: "checkbox",
        width: "48px",
        textAlign: "center",
        whiteSpace: "pre",
      },

      ...subjectLabelHeaderList,
      {
        text: "수업명",
        key: "classTitle",
        type: "text",
        textAlign: "center",
        wordBreak: "keep-all",
        width: "320px",
      },
      {
        text: "시간",
        key: "timeText",
        type: "text",
        textAlign: "center",
        wordBreak: "keep-all",
        width: "120px",
      },
      {
        text: "자세히",
        key: "detail",
        type: "button",
        onClick: (e: any) => {
          setCourseId(e.syllabus ?? e._id);
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
      },
    ]);

    return () => {};
  }, [props.data]);

  return (
    <>
      <Table
        defaultPageBy={10}
        type="object-array"
        data={courseList}
        header={headerList}
        onChange={props.onChange}
      />
      {viewPopupActive && courseId && (
        <ViewPopup course={courseId} setPopupActive={setViewPopupActive} />
      )}
    </>
  );
};

export default CourseTable;
