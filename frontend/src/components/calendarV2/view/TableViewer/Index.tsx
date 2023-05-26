import Table from "components/tableV2/Table";

import { calendarItem } from "../../calendarData";
import {} from "functions/functions";

type Props = {
  eventMap?: Map<string, calendarItem[]>;
};

/**
 * calendar component
 *
 * @param props
 *
 * @returns carlendar component
 *
 * @example <Calendar/>
 *
 * @version 2.0 second version
 */

const TableView = (props: Props) => {
  const getItems = () => {
    const items = [];
    for (let dateText of Array.from(props.eventMap?.keys() ?? [])) {
      items.push(...props.eventMap?.get(dateText)!);
    }
    return items;
  };

  return (
    <div>
      <Table
        type="object-array"
        data={getItems()}
        header={[
          {
            text: "title",
            key: "summary",
            type: "text",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "160px",
          },
          {
            text: "시작",
            key: "startTimeText",
            type: "text",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "120px",
          },
          {
            text: "종료",
            key: "endTimeText",
            type: "text",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "120px",
          },
          {
            text: "종일",
            key: "isAllday",
            type: "status",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "120px",
            status: {
              true: {
                text: "true",
                color: "#B33F00",
              },
              false: {
                text: "false",
                color: "#8657ff",
              },
            },
          },
          {
            text: "htmlLink",
            key: "htmlLink",
            type: "button",
            textAlign: "center",
            wordBreak: "keep-all",
            width: "120px",
            onClick: (e) => {
              console.log(e.htmlLink);
            },
          },
        ]}
      />
    </div>
  );
};

export default TableView;
