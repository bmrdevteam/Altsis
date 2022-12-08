/**
 * @file Notifications Sent Page
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
import { useEffect, useState, useRef } from "react";
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
import Textarea from "components/textarea/Textarea";
import Autofill from "components/input/Autofill";
import Select from "components/select/Select";

import _ from "lodash";
import Input from "components/input/Input";

type Props = {};

const Courses = (props: Props) => {
  const database = useDatabase();

  const { currentUser, currentRegistration } = useAuth();

  const [notificationList, setNotificationList] = useState<any[]>([]);

  const [isRegistratinoListLoaded, setIsRegistrationLoaded] =
    useState<boolean>(false);
  const [receiverOptionList, setReceiverOptionList] = useState<any[]>([]);
  const [receiverSelectedList, setReceiverSelectedList] = useState<any>();

  const [message, setMessage] = useState<string>("");
  const [type, setType] = useState<string>("");

  const [sendPopupActive, setSendPopupActive] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function getNotificationList() {
    const { notifications } = await database.R({
      location: `notifications?fromUserId=${currentUser?.userId}`,
    });

    return notifications;
  }

  async function getRegistrationList() {
    const { registrations } = await database.R({
      location: `registrations?season=${currentRegistration?.season}`,
    });

    return registrations;
  }

  async function sendNotifications() {
    const res = await database.C({
      location: `notifications`,
      data: {
        toUsers: Object.keys(receiverSelectedList).map((receiver: any) =>
          JSON.parse(receiver)
        ),
        type,
        message,
      },
    });

    return res;
  }

  useEffect(() => {
    if (isLoading) {
      getNotificationList().then((res: any) => {
        setNotificationList(
          res.map((notification: any) => {
            return {
              ...notification,
              toUser: `${notification.toUserName}(${notification.toUserId})`,
            };
          })
        );
      });
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    setIsRegistrationLoaded(false);
  }, [currentRegistration]);

  async function updateReceiverOptionList() {
    getRegistrationList().then((res: any) => {
      setReceiverOptionList(
        res.map((registration: any) => {
          return {
            value: JSON.stringify({
              userId: registration.userId,
              userName: registration.userName,
            }),
            text: `${registration.userName}(${registration.userId})`,
          };
        })
      );
    });
  }

  return (
    <>
      <div className={style.section}>
        <Button
          type="ghost"
          onClick={() => {
            if (!isRegistratinoListLoaded) {
              updateReceiverOptionList().then(() => {
                setIsRegistrationLoaded(true);
              });
            }
            setReceiverSelectedList({});
            setMessage("");
            setSendPopupActive(true);
          }}
        >
          알림 보내기
        </Button>
      </div>
      <div className={style.section}>
        <Table
          filter
          type="object-array"
          data={notificationList}
          header={[
            {
              text: "받은사람",
              key: "toUser",
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
        <Popup setState={setSendPopupActive} title="알림 보내기" closeBtn>
          <div style={{ marginTop: "12px" }}>
            <div
              style={{
                marginBottom: "5px",
              }}
            >
              수신자
            </div>

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

            <Autofill
              appearence="flat"
              options={receiverOptionList}
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
                  setType(e.target.value);
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
              <Textarea
                label="메시지"
                onChange={(e: any) => {
                  setMessage(e.target.value);
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
                } else if (message === "") {
                  alert("메시지 없이 메일을 보낼 수 없습니다.");
                } else {
                  sendNotifications()
                    .then((res: any) => {
                      alert("success");
                      setSendPopupActive(false);
                      setIsLoading(true);
                    })
                    .catch((err) => alert(err.response.data.message));
                }
              }}
            >
              전송
            </Button>
          </div>
        </Popup>
      )}
      \
    </>
  );
};

export default Courses;
