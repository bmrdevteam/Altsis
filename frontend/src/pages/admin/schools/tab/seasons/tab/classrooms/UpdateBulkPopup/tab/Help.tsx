/**
 * @file User Add Bulk Popup Tab Item - Help
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

import React, { useState, useRef, useEffect } from "react";
import * as xlsx from "xlsx";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Callout from "components/callout/Callout";
import Textarea from "components/textarea/Textarea";

type Props = {};

const description = `1. 양식을 다운받아 강의실을 A2셀부터 입력합니다.`;

const exampleData = [
  {
    강의실: "104호",
  },
  {
    강의실: "106호",
  },
  {
    강의실: "108호",
  },
  {
    강의실: "209호",
  },
  {
    강의실: "224호",
  },
  {
    강의실: "225호",
  },
  {
    강의실: "245호",
  },
  {
    강의실: "248호",
  },
  {
    강의실: "301호",
  },
  {
    강의실: "309호",
  },
  {
    강의실: "310호",
  },
  {
    강의실: "311호",
  },
  {
    강의실: "342호",
  },
  {
    강의실: "345호",
  },
  {
    강의실: "348호",
  },
  {
    강의실: "351호",
  },
  {
    강의실: "355호",
  },
  {
    강의실: "B101호",
  },
  {
    강의실: "B102호",
  },
];

const exampleDownload = () => {
  const ws = xlsx.utils.json_to_sheet(exampleData);
  const wb = xlsx.utils.book_new();

  xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
  xlsx.writeFile(wb, `example.xlsx`);
};

function Help(props: Props) {
  return (
    <div className={style.popup}>
      <div style={{ marginTop: "24px" }}>
        <Callout
          type="info"
          title="도움말"
          showIcon
          child={
            <Textarea
              defaultValue={description}
              rows={3}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0)",
                margin: "0px",
                padding: "0px",
              }}
              disabled
            />
          }
        />
      </div>
      <div>
        <Button
          type={"ghost"}
          onClick={() => {
            exampleDownload();
          }}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            marginTop: "24px",
          }}
        >
          양식 다운로드
        </Button>
      </div>
    </div>
  );
}

export default Help;
