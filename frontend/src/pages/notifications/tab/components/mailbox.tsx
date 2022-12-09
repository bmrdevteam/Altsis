/**
 * @file Notifications Mailbox Page
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

import React, { useEffect, useRef, useState } from "react";
import useDatabase from "hooks/useDatabase";

// components
import Button from "components/button/Button";
import Table from "components/table/Table";

import Svg from "assets/svg/Svg";
import style from "style/pages/notifications/mailbox.module.scss";

import _ from "lodash";

type Props = {
  type: string;
  data: any[];
  pageInfo?: any;
  deleteNotifications: any;
  setPageInfo: any;
  setIsLoading: any;
};

const Mailbox = (props: Props) => {
  const database = useDatabase();

  const selectRef = useRef<string[]>();

  return (
    <>
      <div style={{ display: "flex" }}>
        <div
          className={style.icon}
          onClick={() => {
            if (_.isEmpty(selectRef.current)) {
              alert("select notifications to delete");
            } else {
              props
                .deleteNotifications(selectRef.current)
                .then((res: any) => {
                  alert("success");
                  props.setIsLoading(true);
                })
                .catch((err: any) => alert(err.response.data.message));
            }
          }}
        >
          <Svg type="trash" width="20px" height="20px" />
        </div>
        <div style={{ marginLeft: "40px" }}>
          {" "}
          {props.pageInfo?.totalDataCnt}개 중{" "}
          {props.pageInfo?.requestSize * (props.pageInfo?.requestPage - 1) + 1}{" "}
          -{" "}
          {props.pageInfo?.requestSize * (props.pageInfo?.requestPage - 1) +
            props.data.length}
        </div>
        <div style={{ marginLeft: "40px" }} />
        {!props.pageInfo?.isFirstPage ? (
          <div
            className={style.icon}
            onClick={() => {
              props.setPageInfo({
                ...props.pageInfo,
                requestPage: props.pageInfo.requestPage - 1,
              });
              props.setIsLoading(true);
            }}
          >
            {"←"}
          </div>
        ) : (
          <div className={style.icon} onClick={() => {}}>
            {"←"}
            {/* <Svg type="arrowLeft" width="20px" height="20px" /> */}
          </div>
        )}
        <div style={{ marginLeft: "20px" }} />
        {!props.pageInfo?.isLastPage ? (
          <div
            className={style.icon}
            onClick={() => {
              props.setPageInfo({
                ...props.pageInfo,
                requestPage: props.pageInfo.requestPage + 1,
              });
              props.setIsLoading(true);
            }}
          >
            {"→"}
          </div>
        ) : (
          <div className={style.icon} onClick={() => {}}>
            {"→"}
          </div>
        )}
      </div>
      <div style={{ marginTop: "12px" }}></div>
      <Table
        filter
        type="object-array"
        data={props.data}
        onSelectChange={(value) => {
          selectRef.current = value.map((val: any) => val._id);

          console.log(selectRef.current);
        }}
        header={
          props.type === "received"
            ? [
                {
                  text: "선택",
                  key: "select",
                  type: "checkbox",
                },
                {
                  text: "보낸사람",
                  key: "fromUser",
                  type: "string",
                },
                {
                  text: "구분",
                  key: "category",
                  type: "string",
                },
                {
                  text: "내용",
                  key: "title",
                  type: "string",
                },
                {
                  text: "날짜",
                  key: "createdAt",
                  type: "date",
                },
              ]
            : [
                {
                  text: "선택",
                  key: "select",
                  type: "checkbox",
                },
                {
                  text: "받은사람",
                  key: "toUser",
                  type: "string",
                },
                {
                  text: "구분",
                  key: "category",
                  type: "string",
                },
                {
                  text: "내용",
                  key: "title",
                  type: "string",
                },
                {
                  text: "날짜",
                  key: "createdAt",
                  type: "date",
                },
              ]
        }
        style={{ bodyHeight: "calc(100vh - 300px)" }}
      />
    </>
  );
};

export default Mailbox;
