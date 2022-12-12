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
import Table from "components/table/Table";

import Svg from "assets/svg/Svg";
import style from "./mailbox.module.scss";

import _ from "lodash";

import View from "../../popup/View";
type Props = {
  type: string;
  data: any[];
  setData: any;
  setIsLoading: any;
  start: number;
  setStart: any;
};

const Mailbox = (props: Props) => {
  const database = useDatabase();
  const [checkAll, setCheckAll] = useState<boolean>(false);
  const selectRef = useRef<string[]>();

  const total = props.data.length;
  const [start, setStart] = useState<number>(props.start);
  const [end, setEnd] = useState<number>(0);

  const [notificationList, setNotificationList] = useState<any[]>([]);

  const [notificatnionPopupActive, setNotificatnionPopupActive] =
    useState<boolean>(false);
  const [notification, setNotification] = useState<any>();

  async function getNotification(_id: string) {
    const res = await database.R({
      location: `notifications/${_id}`,
    });

    return res;
  }

  useEffect(() => {
    if (start >= props.data.length) {
      setStart(start - 10);
      return () => {};
    }

    console.log("start is ", start);
    console.log("props.data.length: ", props.data.length);
    props.setStart(start);
    if (props.data.length < start + 10) {
      setEnd(props.data.length);
    } else {
      setEnd(start + 10);
    }
  }, [start]);

  useEffect(() => {
    console.log("end is ", end);
    const notificationList = [];
    if (props.type === "received") {
      for (let i = start; i < end; i++) {
        notificationList.push({
          ...props.data[i],
          fromUser: `${props.data[i].fromUserName}(${props.data[i].fromUserId})`,
        });
      }
    } else {
      for (let i = start; i < end; i++) {
        notificationList.push({
          ...props.data[i],
          toUser: `${props.data[i].toUserList[0].userName}(${
            props.data[i].toUserList[0].userId
          })${
            props.data[i].toUserList.length > 1
              ? ` 외 ${props.data[i].toUserList.length - 1}명`
              : ``
          }`,
        });
      }
    }

    setNotificationList(notificationList);
  }, [end]);

  async function deleteNotifications(ids: string[]) {
    const res = await database.D({
      location: `notifications/${_.join(ids, "&")}`,
    });
    return res;
  }

  return (
    <>
      <div className={style.mailbox}>
        <div className={style.table_header}>
          <div style={{ display: "flex", marginLeft: "12px" }}>
            <div
              className={style.icon}
              onClick={() => {
                if (checkAll) {
                  setCheckAll(false);
                  selectRef.current = [];
                } else {
                  setCheckAll(true);
                  selectRef.current = notificationList.map(
                    (val: any) => val._id
                  );
                }
              }}
            >
              {checkAll ? (
                <Svg
                  type={"checkboxChecked"}
                  height={"24px"}
                  width={"24px"}
                  style={{ fill: "#0062c7" }}
                />
              ) : (
                <Svg type={"checkbox"} height={"24px"} width={"24px"} />
              )}
            </div>
            <div
              className={style.icon}
              style={{ marginLeft: "12px" }}
              onClick={() => {
                if (_.isEmpty(selectRef.current)) {
                  alert("select notifications to delete");
                } else {
                  deleteNotifications(selectRef.current || [])
                    .then((res: any) => {
                      if (checkAll) setCheckAll(false);
                      props.setIsLoading(true);
                      alert("success");
                    })
                    .catch((err: any) => alert(err.response.data.message));
                }
              }}
            >
              <Svg type="trash" width="20px" height="20px" />
            </div>
          </div>

          <div
            style={{ display: "flex", marginLeft: "auto", marginRight: "12px" }}
          >
            <div className={style.page}>
              {props.data.length === 0
                ? ""
                : `${total}개 중 ${start + 1} - ${end}`}
            </div>
            <div style={{ marginLeft: "12px", display: "flex" }}>
              {!(start === 0) ? (
                <div
                  className={style.icon}
                  onClick={() => {
                    setStart(start - 10);
                  }}
                >
                  <Svg type="chevron-left" width="20px" height="20px" />
                </div>
              ) : (
                <div className={style.icon_disabled} onClick={() => {}}>
                  <Svg type="chevron-left" width="20px" height="20px" />
                </div>
              )}
              <div style={{ marginLeft: "12px" }} />
              {!(end === props.data.length) ? (
                <div
                  className={style.icon}
                  onClick={() => {
                    setStart(start + 10);
                  }}
                >
                  <Svg type="chevron-right" width="20px" height="20px" />
                </div>
              ) : (
                <div className={style.icon_disabled} onClick={() => {}}>
                  <Svg
                    type="chevron-right"
                    width="20px"
                    height="20px"
                    style={{ color: "red" }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "12px" }}></div>
        <Table
          type="object-array"
          data={notificationList}
          onSelectChange={(value) => {
            selectRef.current = value.map((val: any) => val._id);
          }}
          hideHeader={true}
          checkAll={checkAll}
          header={[
            {
              text: "선택",
              key: "select",
              type: "checkbox",
              width: "48px",
            },
            props.type === "received"
              ? {
                  text: "보낸사람",
                  key: "fromUser",
                  type: "string",
                  width: "160px",
                }
              : {
                  text: "받은사람",
                  key: "toUser",
                  type: "string",
                  width: "160px",
                },
            {
              text: "구분",
              key: "category",
              type: "string",
              width: "120px",
            },
            {
              text: "제목",
              key: "title",
              type: "string",
              width: "240px",
            },
            {
              text: "본문",
              key: "description",
              type: "string",
            },
            {
              text: "날짜",
              key: "createdAt",
              type: "date",
              align: "right",
            },
            {
              text: "자세히",
              key: "_id",
              type: "button",
              onClick: (e: any) => {
                getNotification(e._id)
                  .then((res) => {
                    setNotification(res);
                    setNotificatnionPopupActive(true);
                  })
                  .catch((err) => alert(err.response.data.message));
              },
              width: "80px",
              align: "center",
            },
          ]}
          style={{ bodyHeight: "calc(100vh - 300px)" }}
        />
      </div>
      {notificatnionPopupActive && (
        <View
          setState={setNotificatnionPopupActive}
          data={notification}
          type={props.type}
        />
      )}
    </>
  );
};

export default Mailbox;
