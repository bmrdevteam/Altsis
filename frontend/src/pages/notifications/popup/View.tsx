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

import { useState } from "react";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";

import _ from "lodash";
import Textarea from "components/textarea/Textarea";

import Reply from "./Reply";

import style from "./mail.module.scss";

type Props = { setState: any; data: any; type?: string };

const NotificationSend = (props: Props) => {
  const [replyPopupActive, setReplyPopupActive] = useState<boolean>(false);

  return (
    <>
      <Popup
        setState={props.setState}
        closeBtn
        title={`${props.data.category ? `[${props.data.category}] ` : ""}${
          props.data.title
        }`}
      >
        <div>
          <div>
            {props.type === "received" ? (
              <Input
                label="발신자"
                defaultValue={`${props.data.fromUserName}(${props.data.fromUserId})`}
                disabled
              />
            ) : (
              <Input
                label="수신자"
                defaultValue={_.join(
                  props.data.toUserList.map(
                    (toUser: any) => `${toUser.userName}(${toUser.userId})`
                  ),
                  ", "
                )}
                disabled
              />
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "24px",
            }}
          >
            <Textarea
              label="본문"
              defaultValue={props.data.description}
              disabled
            />
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
      {replyPopupActive && (
        <Reply
          setState={setReplyPopupActive}
          title={props.data.title}
          toUser={props.data.fromUser}
          toUserId={props.data.fromUserId}
          toUserName={props.data.fromUserName}
        />
      )}
    </>
  );
};

export default NotificationSend;
