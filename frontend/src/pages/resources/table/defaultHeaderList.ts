import { TTableHeader } from "components/tableV2/Table";

export const defaultHeaderList: TTableHeader[] = [
  {
    text: "시간",
    key: "timeText",
    type: "text",
    textAlign: "center",
    wordBreak: "keep-all",
    width: "120px",
  },
  {
    text: "강의실",
    key: "classroom",
    type: "text",
    textAlign: "center",
    whiteSpace: "pre",
    width: "80px",
  },

  {
    text: "학점",
    key: "point",
    type: "text",
    textAlign: "center",
    whiteSpace: "pre",
    width: "60px",
  },
  {
    text: "수강/정원",
    key: "count_limit",
    type: "text",
    textAlign: "center",
    whiteSpace: "pre",
    width: "80px",
  },
  {
    text: "개설자",
    key: "userName",
    type: "text",
    textAlign: "center",
    wordBreak: "keep-all",
    width: "80px",
  },
  {
    text: "지도교사",
    key: "mentorText",
    type: "text",
    textAlign: "center",
    wordBreak: "keep-all",
    width: "80px",
  },
];
