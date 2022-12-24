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

import { useState, useRef, useEffect } from "react";
import useDatabase from "hooks/useDatabase";

// components
import Button from "components/button/Button";
import Autofill from "components/input/Autofill";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";

import _ from "lodash";
import Textarea from "components/textarea/Textarea";
import Select from "components/select/Select";
import Table from "components/tableV2/Table";

import style from "./mail.module.scss";
import Svg from "assets/svg/Svg";

type Props = {
  setState: any;
  receiverOptionList: any[];
  receiverSelectedList?: any;
  category?: string;
  title?: string;
  receiverList?: any[];
  receiverType?: string;
};

const NotificationSend = (props: Props) => {
  const database = useDatabase();

  const [receiverSelectedList, setReceiverSelectedList] = useState<any>(
    props.receiverSelectedList || {}
  );
  const [receiverSelectPopupActive, setReceiverSelectPopupActive] =
    useState<boolean>(false);
  const [isReceiverListLoaded, setIsReceiverListLoaded] =
    useState<boolean>(false);
  const [receiverList, setReceiverList] = useState<any[]>();
  const selectRef = useRef<any[]>([]);

  const [title, setTitle] = useState<string>(props.title || "");
  const [category, setCategory] = useState<string>(props.category || "");
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

  useEffect(() => {
    console.log("receiverList is updated: ", receiverList);

    return () => {};
  }, [receiverList]);

  const loadReceiverList = () => {
    console.log("loading");
    if (props.receiverType === "academy") {
      setReceiverList(
        props.receiverList?.map((receiver: any) => {
          return {
            ...receiver,
            schoolsText: _.join(
              receiver.schools.map((school: any) => school.schoolName),
              ", "
            ),
          };
        })
      );
      setIsReceiverListLoaded(true);
    } else {
      setReceiverList(props.receiverList);
      setIsReceiverListLoaded(true);
    }
  };

  const receiverListHeader: { [key: string]: any } = {
    season: [
      {
        text: "checkbox",
        key: "",
        type: "checkbox",
        width: "48px",
      },
      {
        text: "역할",
        key: "role",
        textAlign: "center",
        type: "status",
        status: {
          teacher: { text: "선생님", color: "blue" },
          student: { text: "학생", color: "orange" },
        },
      },
      {
        text: "ID",
        key: "userId",
        type: "text",
        textAlign: "center",
      },
      {
        text: "이름",
        key: "userName",
        type: "text",
        textAlign: "center",
      },

      {
        text: "학년",
        key: "grade",
        type: "text",
        textAlign: "center",
      },
      {
        text: "그룹",
        key: "group",
        type: "text",
        textAlign: "center",
      },
      {
        text: "선생님 ID",
        key: "teacherId",
        type: "text",
        textAlign: "center",
      },
      {
        text: "선생님 이름",
        key: "teacherName",
        type: "text",
        textAlign: "center",
      },
    ],
    school: [
      {
        text: "checkbox",
        key: "",
        type: "checkbox",
        width: "48px",
      },

      {
        text: "ID",
        key: "userId",
        type: "text",
        textAlign: "center",
      },
      {
        text: "이름",
        key: "userName",
        type: "text",
        textAlign: "center",
      },
    ],
    academy: [
      {
        text: "checkbox",
        key: "",
        type: "checkbox",
        width: "48px",
      },

      {
        text: "학교",
        key: "schoolsText",
        type: "text",
        textAlign: "center",
      },
      {
        text: "ID",
        key: "userId",
        type: "text",
        textAlign: "center",
      },
      {
        text: "이름",
        key: "userName",
        type: "text",
        textAlign: "center",
      },
    ],
    enrollment: [
      {
        text: "checkbox",
        key: "",
        type: "checkbox",
        width: "48px",
      },

      {
        text: "학년",
        key: "studentGrade",
        type: "text",
        textAlign: "center",
      },
      {
        text: "ID",
        key: "userId",
        type: "text",
        textAlign: "center",
      },
      {
        text: "이름",
        key: "userName",
        type: "text",
        textAlign: "center",
      },
    ],
    undefined: [
      {
        text: "checkbox",
        key: "",
        type: "checkbox",
        width: "48px",
      },
      {
        text: "ID",
        key: "userId",
        type: "text",
        textAlign: "center",
      },
      {
        text: "이름",
        key: "userName",
        type: "text",
        textAlign: "center",
      },
    ],
  };

  return (
    <>
      {" "}
      <Popup
        setState={props.setState}
        title="알림 보내기"
        style={{ maxWidth: "320px" }}
        closeBtn
      >
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
            }}
          >
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
            <div
              className={style.icon}
              onClick={() => {
                if (!isReceiverListLoaded) {
                  loadReceiverList();
                }
                setReceiverSelectPopupActive(true);
              }}
            >
              <Svg type="list_check" width="20px" height="20px" />
            </div>
          </div>
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "4px",
              overflow: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {Object.keys(receiverSelectedList).map((receiver: any) => {
              const { userId, userName } = JSON.parse(receiver);

              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    color: "gray",
                    border: "1px solid",
                    padding: "0px 4px 0px 4px",
                    fontSize: "12px",
                    fontWeight: "12px",
                    borderRadius: "12px",
                    cursor: "pointer",
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
                    X
                  </Button>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "12px",
            }}
          >
            <Input
              label="구분"
              onChange={(e: any) => {
                setCategory(e.target.value);
              }}
              defaultValue={category}
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
              required
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
      {receiverSelectPopupActive && isReceiverListLoaded && (
        <Popup
          setState={setReceiverSelectPopupActive}
          closeBtn
          title={"수신자 선택"}
          contentScroll
          footer={
            <Button
              type="ghost"
              onClick={() => {
                setReceiverSelectedList(
                  selectRef.current.reduce(
                    (acc: any, receiver: any, i: number) => {
                      acc[
                        JSON.stringify({
                          userId: receiver.userId,
                          userName: receiver.userName,
                        })
                      ] = true;
                      return acc;
                    },
                    {}
                  )
                );
                setReceiverSelectPopupActive(false);
              }}
            >
              선택
            </Button>
          }
        >
          <Table
            data={receiverList || []}
            type="object-array"
            control
            defaultPageBy={50}
            onChange={(value: any[]) => {
              selectRef.current = _.filter(value, {
                tableRowChecked: true,
              });
            }}
            header={receiverListHeader[props.receiverType || "undefined"]}
          />
        </Popup>
      )}
    </>
  );
};

export default NotificationSend;
