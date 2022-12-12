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
import Autofill from "components/input/Autofill";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";

import _ from "lodash";
import Textarea from "components/textarea/Textarea";

type Props = { setState: any; receiverOptionList: any[] };

const NotificationSend = (props: Props) => {
  const database = useDatabase();

  const [receiverSelectedList, setReceiverSelectedList] = useState<any>({});

  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  async function sendNotifications() {
    const res = await database.C({
      location: `notifications`,
      data: {
        toUserList: Object.keys(receiverSelectedList).map((receiver: any) =>
          JSON.parse(receiver)
        ),
        category,
        title,
        description,
      },
    });

    return res;
  }

  console.log("test1");
  return (
    <Popup setState={props.setState} title="알림 보내기" closeBtn>
      <div style={{ marginTop: "12px" }}>
        <Autofill
          label="수신자"
          appearence="flat"
          options={props.receiverOptionList}
          setState={(e: string) => {
            if (!receiverSelectedList[e]) {
              receiverSelectedList[e] = true;
              setReceiverSelectedList({
                ...receiverSelectedList,
              });
            }
          }}
          required
          placeholder={"이름 또는 아이디로 검색"}
          resetOnClick
        />
        <div>
          {Object.keys(receiverSelectedList).map((receiver: any) => {
            const { userId, userName } = JSON.parse(receiver);

            return (
              <div
                style={{
                  display: "flex",
                }}
              >
                {`${userName}(${userId})`}
                <Button
                  type="ghost"
                  onClick={(e: any) => {
                    delete receiverSelectedList[receiver];
                    setReceiverSelectedList({
                      ...receiverSelectedList,
                    });
                  }}
                  style={{
                    border: 0,
                    color: "gray",
                  }}
                >
                  x
                </Button>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "24px",
          }}
        >
          <Input
            label="타입"
            onChange={(e: any) => {
              setCategory(e.target.value);
            }}
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
            label="타이틀"
            onChange={(e: any) => {
              setTitle(e.target.value);
            }}
            required
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
            label="메시지"
            onChange={(e: any) => {
              setDescription(e.target.value);
            }}
          />
        </div>

        <Button
          style={{ marginTop: "24px" }}
          type="ghost"
          onClick={() => {
            console.log("receiverSelectedList: ", receiverSelectedList);
            if (_.isEmpty(receiverSelectedList)) {
              alert("받는사람을 한 명 이상 지정해야 합니다.");
            } else if (title === "") {
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
