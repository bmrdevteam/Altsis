/**
 * @file Send Notification Popup
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

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";

import _ from "lodash";
import Textarea from "components/textarea/Textarea";

import Reply from "./Reply";

import style from "./mail.module.scss";
import { TNotification } from "types/notification";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = { setState: any; type?: string; nid?: string };

const NotificationView = (props: Props) => {
  const [replyPopupActive, setReplyPopupActive] = useState<boolean>(false);
  const { NotificationAPI } = useAPIv2();

  const [notification, setNotification] = useState<TNotification | undefined>();

  useEffect(() => {
    if (props.nid) {
      NotificationAPI.RNotification({ params: { _id: props.nid } })
        .then(({ notification }) => {
          setNotification(notification);
        })
        .catch((err) => {
          ALERT_ERROR(err);
        });
    }

    return () => {};
  }, [props.nid]);

  return (
    <>
      <Popup
        setState={props.setState}
        closeBtn
        title={`${
          notification?.category ? `[${notification?.category}] ` : ""
        }${notification?.title}`}
      >
        <div>
          <div>
            {notification &&
              (notification.type === "received" ? (
                <Input
                  label="발신자"
                  defaultValue={`${notification.fromUserName}(${notification.fromUserId})`}
                  disabled
                />
              ) : (
                <Input
                  label="수신자"
                  defaultValue={_.join(
                    notification.toUserList?.map(
                      (toUser: any) => `${toUser.userName}(${toUser.userId})`
                    ),
                    ", "
                  )}
                  disabled
                />
              ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "24px",
            }}
          >
            <Textarea defaultValue={notification?.description} disabled />
          </div>

          {props.type === "received" && (
            <Button
              style={{ marginTop: "24px" }}
              type="ghost"
              onClick={() => {
                setReplyPopupActive(true);
              }}
            >
              답장
            </Button>
          )}
        </div>
      </Popup>

      {replyPopupActive && notification && (
        <Reply
          setState={setReplyPopupActive}
          title={notification.title}
          toUser={notification.fromUser ?? ""}
          toUserId={notification.fromUserId ?? ""}
          toUserName={notification.fromUserName ?? ""}
        />
      )}
    </>
  );
};

export default NotificationView;
