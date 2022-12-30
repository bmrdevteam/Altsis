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
import useDatabase from "hooks/useDatabase";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";

import _ from "lodash";
import Textarea from "components/textarea/Textarea";

type Props = {
  setState: any;
  title: string;
  toUserName: string;
  toUserId: string;
};

const NotificationSend = (props: Props) => {
  const database = useDatabase();

  const [title, setTitle] = useState<string>(`RE: ${props.title}`);
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  async function sendNotifications() {
    const res = await database.C({
      location: `notifications`,
      data: {
        toUserList: [{ userId: props.toUserId, userName: props.toUserName }],
        category,
        title,
        description,
      },
    });

    return res;
  }

  return (
    <Popup setState={props.setState} title="답장" closeBtn>
      <div style={{ marginTop: "12px" }}>
        <div>
          <Input
            label="수신자"
            defaultValue={`${props.toUserName}(${props.toUserId})`}
            disabled
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "24px",
          }}
        >
          <Input
            label="제목"
            onChange={(e: any) => {
              setTitle(e.target.value);
            }}
            defaultValue={title}
          />
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
            onChange={(e: any) => {
              setDescription(e.target.value);
            }}
          />
        </div>

        <Button
          style={{ marginTop: "24px" }}
          type="ghost"
          onClick={() => {
            if (title === "") {
              alert("타이틀 없이 메일을 보낼 수 없습니다.");
            } else {
              sendNotifications()
                .then((res: any) => {
                  alert("success");
                  props.setState(false);
                })
                .catch((err) => alert(err.response.data.message));
            }
          }}
        >
          전송
        </Button>
      </div>
    </Popup>
  );
};

export default NotificationSend;
