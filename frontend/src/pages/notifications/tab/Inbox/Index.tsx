/**
 * @file Notifications Inbox Page
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/enrollment.module.scss";

// navigation bar
import Navbar from "layout/navbar/Navbar";

// components
import Popup from "components/popup/Popup";
import Table from "components/table/Table";
import Button from "components/button/Button";

import _ from "lodash";

type Props = {};

const Courses = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();

  const { currentSeason, currentUser } = useAuth();

  const [notificationList, setNotificationList] = useState<any[]>([]);

  const [sendPopupActive, setSendPopupActive] = useState<boolean>(false);

  async function getNotificationList() {
    const { notifications } = await database.R({
      location: `notifications?toUserId=${currentUser?.userId}`,
    });

    return notifications;
  }

  useEffect(() => {
    getNotificationList().then((res: any) => {
      setNotificationList(
        res.map((notification: any) => {
          return {
            ...notification,
            fromUser: `${notification.fromUserName}(${notification.fromUserId})`,
          };
        })
      );
    });
  }, []);

  return (
    <>
      <div className={style.section}>
        <Table
          filter
          type="object-array"
          data={notificationList}
          header={[
            {
              text: "보낸사람",
              key: "fromUser",
              type: "string",
            },
            {
              text: "구분",
              key: "type",
              type: "string",
            },
            {
              text: "내용",
              key: "message",
              type: "string",
            },
            {
              text: "날짜",
              key: "createdAt",
              type: "date",
            },
          ]}
          style={{ bodyHeight: "calc(100vh - 300px)" }}
        />
      </div>

      {sendPopupActive && (
        <Popup setState={() => {}} title="가입된 시즌이 없습니다">
          <div style={{ marginTop: "12px" }}>
            <Button
              type="ghost"
              onClick={() => {
                navigate("/");
              }}
            >
              메인 화면으로 돌아가기
            </Button>
          </div>
        </Popup>
      )}
    </>
  );
};

export default Courses;
