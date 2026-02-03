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
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import { TBoard } from "types/board";

type Props = {
  setState: any;
  category?: string;
  title?: string;
  receiverList?: any[];
  receiverSelectedList?: any[];
  receiverType?: string;
  setIsLoading?: any;
};

const NotificationSend = (props: Props) => {
  const { PostAPI, BoardAPI } = useAPIv2();
  const { currentSchool } = useAuth();
  const [receiverList, setReceiverList] = useState<any[]>();
  const [receiverSelectedList, setReceiverSelectedList] = useState<any[]>(
    props.receiverSelectedList || []
  );

  const [receiverSelectPopupActive, setReceiverSelectPopupActive] =
    useState<boolean>(false);
  const [isReceiverListLoaded, setIsReceiverListLoaded] =
    useState<boolean>(false);
  const selectRef = useRef<any[]>([]);

  const [title, setTitle] = useState<string>(props.title || "");
  const [content, setContent] = useState<string>("");

  // Board selection state
  const [boards, setBoards] = useState<TBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [isBoardsLoading, setIsBoardsLoading] = useState<boolean>(true);

  // Fetch boards for the current school
  useEffect(() => {
    if (currentSchool?._id) {
      BoardAPI.RBoards({ query: { school: currentSchool._id } })
        .then(({ boards }) => {
          setBoards(boards);
          if (boards.length > 0) {
            setSelectedBoardId(boards[0]._id);
          }
          setIsBoardsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsBoardsLoading(false);
        });
    } else {
      setIsBoardsLoading(false);
    }
  }, [currentSchool]);

  useEffect(() => {
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
        }) || []
      );
    } else {
      setReceiverList(props.receiverList || []);
    }
    return () => {};
  }, []);

  useEffect(() => {
    if (receiverList) {
      // console.log("receiverList", receiverList);
      setIsReceiverListLoaded(true);
    }
    return () => {};
  }, [receiverList]);

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
      {isReceiverListLoaded && !isBoardsLoading && (
        <Popup
          setState={props.setState}
          title="알림 보내기"
          style={{ maxWidth: "320px" }}
          closeBtn
          contentScroll
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
                options={
                  receiverList?.map((e: any) => {
                    return {
                      value: JSON.stringify({
                        user: props.receiverType === "season" ? e.user : e._id,
                        userId: e.userId,
                        userName: e.userName,
                      }),
                      text: `${e.userName}(${e.userId})`,
                    };
                  }) || []
                }
                setState={(e: string) => {
                  setReceiverSelectedList(
                    _.uniqBy(
                      [...receiverSelectedList, JSON.parse(e)],
                      (obj) => obj.userId
                    )
                  );
                }}
                required
                placeholder={"이름 또는 아이디로 검색"}
                resetOnClick
              />
              <div
                className={style.icon}
                onClick={() => {
                  selectRef.current = receiverSelectedList;
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
              {receiverSelectedList.map((receiver: any) => {
                const { userId, userName } = receiver;

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
                        // console.log("receiver is ", receiver);

                        setReceiverSelectedList(
                          _.filter(receiverSelectedList, (val) => {
                            return val.userId !== userId;
                          })
                        );
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

            {/* Board Selection */}
            <div
              style={{
                marginTop: "12px",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                알림 선택<span style={{ color: "red" }}>*</span>
              </label>
              {boards.length > 0 && (
                <Select
                  key={selectedBoardId}
                  options={boards.map((board) => ({
                    text: board.name,
                    value: board._id,
                  }))}
                  defaultSelectedValue={selectedBoardId}
                  appearence="flat"
                  onChange={(value: string) => {
                    setSelectedBoardId(value);
                  }}
                />
              )}
              {boards.length === 0 && !isBoardsLoading && (
                <p
                  style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "var(--red)",
                  }}
                >
                  등록된 알림이 없습니다. 관리자에게 문의하세요.
                </p>
              )}
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
                label="내용"
                onChange={(e: any) => {
                  setContent(e.target.value);
                }}
              />
            </div>

            <Button
              style={{ marginTop: "24px" }}
              type="ghost"
              onClick={() => {
                if (!selectedBoardId) {
                  alert("알림을 선택해주세요.");
                } else if (_.isEmpty(receiverSelectedList)) {
                  alert("받는사람을 한 명 이상 지정해야 합니다.");
                } else if (title === "") {
                  alert("제목을 입력해주세요.");
                } else {
                  PostAPI.CPost({
                    data: {
                      board: selectedBoardId,
                      title,
                      content,
                      targetAudience: {
                        type: "custom",
                        users: receiverSelectedList.map((receiver: any) => ({
                          user: receiver.user,
                          userId: receiver.userId,
                          userName: receiver.userName,
                        })),
                      },
                    },
                  })
                    .then(() => {
                      alert(SUCCESS_MESSAGE);

                      if (props.setIsLoading) {
                        props.setIsLoading(true);
                      }

                      props.setState(false);
                    })
                    .catch((err) => {
                      ALERT_ERROR(err);
                      console.error(err);
                    });
                }
              }}
            >
              전송
            </Button>
          </div>
        </Popup>
      )}
      {receiverSelectPopupActive && (
        <Popup
          setState={setReceiverSelectPopupActive}
          closeBtn
          title={"수신자 선택"}
          contentScroll
          footer={
            <Button
              type="ghost"
              onClick={() => {
                setReceiverSelectedList(selectRef.current);
                setReceiverSelectPopupActive(false);
              }}
            >
              선택
            </Button>
          }
        >
          <Table
            data={
              receiverList?.map((receiver: any) => {
                if (_.find(selectRef.current, { userId: receiver.userId }))
                  receiver.tableRowChecked = true;
                else receiver.tableRowChecked = false;
                return receiver;
              }) || []
            }
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
