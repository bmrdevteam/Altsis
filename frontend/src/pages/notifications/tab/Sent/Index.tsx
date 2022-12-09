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
import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/enrollment.module.scss";

// components
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Textarea from "components/textarea/Textarea";
import Autofill from "components/input/Autofill";

import _ from "lodash";
import Input from "components/input/Input";

import Mailbox from "../components/mailbox";

type Props = {};

const Sent = (props: Props) => {
  const database = useDatabase();

  const { currentUser, currentRegistration } = useAuth();

  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [pageInfo, setPageInfo] = useState<any>({
    requestPage: 1,
    requestSize: 10,
  });

  const [isRegistratinoListLoaded, setIsRegistrationLoaded] =
    useState<boolean>(false);
  const [receiverOptionList, setReceiverOptionList] = useState<any[]>([]);
  const [receiverSelectedList, setReceiverSelectedList] = useState<any>();

  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const [sendPopupActive, setSendPopupActive] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function getNotificationList() {
    const { notifications, page } = await database.R({
      location: `notifications?type=sent&userId=${currentUser?.userId}&page=${pageInfo.requestPage}&size=${pageInfo.requestSize}`,
    });

    return { notifications, page };
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
        toUserList: Object.keys(receiverSelectedList).map((receiver: any) =>
          JSON.parse(receiver)
        ),
        category,
        title,
      },
    });

    return res;
  }

  async function deleteNotifications(ids: string[]) {
    const res = await database.D({
      location: `notifications/${_.join(ids, "&")}`,
    });
    return res;
  }

  useEffect(() => {
    if (isLoading) {
      getNotificationList().then((res: any) => {
        setNotificationList(
          res.notifications.map((notification: any) => {
            return {
              ...notification,
              toUser: `${notification.toUserList[0].userName}(${
                notification.toUserList[0].userId
              })${
                notification.toUserList.length === 1
                  ? ""
                  : `외 ${notification.toUserList.length - 1}명`
              }`,
            };
          })
        );
        setPageInfo(res.page);
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
            setTitle("");
            setSendPopupActive(true);
          }}
        >
          알림 보내기
        </Button>
      </div>
      <div className={style.section}>
        <Mailbox
          type="sent"
          data={notificationList}
          pageInfo={pageInfo}
          deleteNotifications={deleteNotifications}
          setIsLoading={setIsLoading}
          setPageInfo={setPageInfo}
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
              <Textarea
                label="메시지"
                onChange={(e: any) => {
                  setTitle(e.target.value);
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
    </>
  );
};

export default Sent;
