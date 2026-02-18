/**
 * @file Post Create/Edit Page
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import _ from "lodash";

import style from "style/pages/enrollment.module.scss";

import Input from "components/input/Input";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import Autofill from "components/input/Autofill";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import { MarkdownEditor } from "components/markdown";

import { TBoard, TBoardMembers, TMemberUser } from "types/board";
import { TPost } from "types/post";

const PostCreate = () => {
  const navigate = useAppNavigate();
  const { boardId, postId } = useParams<{
    boardId: string;
    postId?: string;
  }>();
  const { currentUser, currentSchool } = useAuth();
  const { BoardAPI, PostAPI, UserAPI } = useAPIv2();

  const [board, setBoard] = useState<TBoard | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 읽기 권한: 특정 대상만 설정 여부
  const [useSpecificPermission, setUseSpecificPermission] = useState(false);
  const [permissionRead, setPermissionRead] = useState<TBoardMembers>({
    groups: { manager: true, teacher: true, student: true },
    users: [],
  });

  const [userList, setUserList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!postId;

  useEffect(() => {
    if (isLoading && boardId) {
      const promises: Promise<any>[] = [
        BoardAPI.RBoard({ params: { _id: boardId } }),
        UserAPI.RUsers({ query: { sid: currentSchool?.school } }),
      ];

      if (postId) {
        promises.push(PostAPI.RPost({ params: { _id: postId } }));
      }

      Promise.all(promises)
        .then(([boardRes, usersRes, postRes]) => {
          const loadedBoard: TBoard = boardRes.board;
          setBoard(loadedBoard);
          setUserList(usersRes.users || []);

          if (postRes?.post) {
            const post: TPost = postRes.post;
            setTitle(post.title);
            setContent(post.content);

            // 새 구조: permissionRead
            if (post.permissionRead?.groups) {
              setUseSpecificPermission(true);
              setPermissionRead(post.permissionRead);
            }
            // 레거시 폴백: targetAudience → permissionRead 변환
            else if (
              post.targetAudience?.type &&
              post.targetAudience.type !== "all"
            ) {
              setUseSpecificPermission(true);
              const ta = post.targetAudience;
              if (ta.type === "custom" && ta.users) {
                setPermissionRead({
                  groups: { manager: false, teacher: false, student: false },
                  users: ta.users.map((u) => ({
                    user: u.user,
                    userId: u.userId,
                    userName: u.userName,
                  })),
                });
              } else {
                setPermissionRead({
                  groups: {
                    manager: ta.type === "manager",
                    teacher: ta.type === "teacher",
                    student: ta.type === "student",
                  },
                  users: [],
                });
              }
            } else {
              // 전체 공개
              setUseSpecificPermission(false);
              setPermissionRead({
                groups: {
                  manager: loadedBoard.members?.groups?.manager ?? true,
                  teacher: loadedBoard.members?.groups?.teacher ?? true,
                  student: loadedBoard.members?.groups?.student ?? true,
                },
                users: [],
              });
            }
          } else {
            // 신규 작성: 보드 멤버 그룹으로 기본값
            setPermissionRead({
              groups: {
                manager: loadedBoard.members?.groups?.manager ?? true,
                teacher: loadedBoard.members?.groups?.teacher ?? true,
                student: loadedBoard.members?.groups?.student ?? true,
              },
              users: [],
            });
          }

          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsLoading(false);
        });
    }
  }, [isLoading, boardId, postId]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }
    if (
      useSpecificPermission &&
      !permissionRead.groups.manager &&
      !permissionRead.groups.teacher &&
      !permissionRead.groups.student &&
      permissionRead.users.length === 0
    ) {
      alert("읽기 권한 대상을 한 명 이상 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const postPermissionRead = useSpecificPermission ? permissionRead : undefined;

      if (isEditMode && postId) {
        await PostAPI.UPost({
          params: { _id: postId },
          data: {
            title: title.trim(),
            content: content.trim(),
            permissionRead: useSpecificPermission ? permissionRead : null,
          },
        });
        alert("수정되었습니다.");
        navigate(`/boards/${boardId}/post/${postId}`);
      } else {
        const { post } = await PostAPI.CPost({
          data: {
            board: boardId!,
            title: title.trim(),
            content: content.trim(),
            permissionRead: postPermissionRead,
          },
        });
        alert("작성되었습니다.");
        navigate(`/boards/${boardId}/post/${post._id}`);
      }
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = (userJson: string) => {
    const parsed: TMemberUser = JSON.parse(userJson);
    setPermissionRead((prev) => ({
      ...prev,
      users: _.uniqBy([...prev.users, parsed], (u) => u.userId),
    }));
  };

  const handleRemoveUser = (userId: string) => {
    setPermissionRead((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.userId !== userId),
    }));
  };

  const getUserOptions = () => {
    const existingIds = new Set(permissionRead.users.map((u) => u.userId));
    return userList
      .filter((u: any) => !existingIds.has(u.userId))
      .map((u: any) => ({
        text: `${u.userName}(${u.userId})`,
        value: JSON.stringify({
          user: u._id,
          userId: u.userId,
          userName: u.userName,
        }),
      }));
  };

  return (
    <>
      <div className={style.section}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onClick={() => navigate(`/boards/${boardId}`)}
          >
            <Svg type="chevronLeft" width="24px" height="24px" />
          </div>
          <div className={style.title} style={{ margin: 0 }}>
            {board?.name} - {isEditMode ? "글 수정" : "글 작성"}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <Input
            label="제목"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
          />
        </div>

        {/* 읽기 권한 설정 */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <label
              style={{
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              읽기 권한 지정
            </label>
            <ToggleSwitch
              defaultChecked={useSpecificPermission}
              onChange={(checked: boolean) => {
                setUseSpecificPermission(checked);
                if (!checked) {
                  // 해제 시 보드 멤버 전체로 초기화
                  setPermissionRead({
                    groups: {
                      manager: board?.members?.groups?.manager ?? true,
                      teacher: board?.members?.groups?.teacher ?? true,
                      student: board?.members?.groups?.student ?? true,
                    },
                    users: [],
                  });
                }
              }}
            />
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginBottom: useSpecificPermission ? "12px" : "0",
            }}
          >
            {useSpecificPermission
              ? "선택한 대상만 이 게시글을 볼 수 있으며 알림을 받습니다."
              : "보드 멤버 전체가 이 게시글을 볼 수 있으며 알림을 받습니다."}
          </p>

          {useSpecificPermission && board && (
            <div
              style={{
                padding: "12px",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                backgroundColor: "var(--background-color-2)",
              }}
            >
              {/* 역할 그룹 토글 (보드 멤버에서 활성화된 그룹만 표시) */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {board.members?.groups?.manager && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>관리자</span>
                    <ToggleSwitch
                      defaultChecked={permissionRead.groups.manager}
                      onChange={(checked: boolean) =>
                        setPermissionRead((prev) => ({
                          ...prev,
                          groups: { ...prev.groups, manager: checked },
                        }))
                      }
                    />
                  </div>
                )}
                {board.members?.groups?.teacher && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>교사</span>
                    <ToggleSwitch
                      defaultChecked={permissionRead.groups.teacher}
                      onChange={(checked: boolean) =>
                        setPermissionRead((prev) => ({
                          ...prev,
                          groups: { ...prev.groups, teacher: checked },
                        }))
                      }
                    />
                  </div>
                )}
                {board.members?.groups?.student && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>학생</span>
                    <ToggleSwitch
                      defaultChecked={permissionRead.groups.student}
                      onChange={(checked: boolean) =>
                        setPermissionRead((prev) => ({
                          ...prev,
                          groups: { ...prev.groups, student: checked },
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* 개별 사용자 선택 */}
              <div style={{ marginTop: "12px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    marginBottom: "6px",
                  }}
                >
                  개별 사용자 지정
                </label>
                <Autofill
                  appearence="flat"
                  placeholder="이름 또는 아이디로 검색"
                  options={getUserOptions()}
                  setState={(val: string) => handleAddUser(val)}
                  resetOnClick
                />
                {permissionRead.users.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {permissionRead.users.map((u) => (
                      <div
                        key={u.userId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          backgroundColor: "var(--component-color)",
                          borderRadius: "16px",
                          fontSize: "13px",
                        }}
                      >
                        <span>
                          {u.userName}({u.userId})
                        </span>
                        <button
                          onClick={() => handleRemoveUser(u.userId)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "0",
                            fontSize: "14px",
                            color: "var(--text-color-2)",
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            내용
          </label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="마크다운 형식으로 작성할 수 있습니다."
            minHeight="400px"
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <Button type="ghost" onClick={() => navigate(`/boards/${boardId}`)}>
            취소
          </Button>
          <Button type="ghost" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? "처리 중..."
              : isEditMode
              ? "수정 완료"
              : "작성 완료"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default PostCreate;
