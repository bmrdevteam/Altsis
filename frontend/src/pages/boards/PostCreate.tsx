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
import Select from "components/select/Select";
import Autofill from "components/input/Autofill";
import { MarkdownEditor } from "components/markdown";

import { TBoard } from "types/board";
import { TPost, TPostTargetAudience, TPostTargetUser } from "types/post";

type TargetType = "all" | "manager" | "teacher" | "student" | "custom";

const PostCreate = () => {
  const navigate = useAppNavigate();
  const { boardId, postId } = useParams<{ boardId: string; postId?: string }>();
  const { currentUser, currentSchool } = useAuth();
  const { BoardAPI, PostAPI, UserAPI } = useAPIv2();

  const [board, setBoard] = useState<TBoard | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("all");
  const [selectedUsers, setSelectedUsers] = useState<TPostTargetUser[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!postId;
  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const targetOptions = [
    { text: "전체", value: "all" },
    { text: "관리자", value: "manager" },
    { text: "교사", value: "teacher" },
    { text: "학생", value: "student" },
    { text: "지정", value: "custom" },
  ];

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
          setBoard(boardRes.board);
          setUserList(usersRes.users || []);

          if (postRes?.post) {
            const post: TPost = postRes.post;
            setTitle(post.title);
            setContent(post.content);
            if (post.targetAudience?.type) {
              setTargetType(post.targetAudience.type as TargetType);
              if (post.targetAudience.type === "custom" && post.targetAudience.users) {
                setSelectedUsers(post.targetAudience.users);
              }
            }
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
    if (targetType === "custom" && selectedUsers.length === 0) {
      alert("알림을 받을 사용자를 한 명 이상 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const targetAudience: TPostTargetAudience = {
        type: targetType,
        ...(targetType === "custom" && { users: selectedUsers }),
      };

      if (isEditMode && postId) {
        await PostAPI.UPost({
          params: { _id: postId },
          data: {
            title: title.trim(),
            content: content.trim(),
            targetAudience,
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
            targetAudience,
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
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
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
            defaultValue={title}
            onChange={(e: any) => setTitle(e.target.value)}
          />
        </div>

        {/* 알림 대상 선택 */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            알림 대상
          </label>
          <Select
            options={targetOptions}
            defaultSelectedValue={targetType}
            appearence="flat"
            onChange={(value: string) => {
              setTargetType(value as TargetType);
              if (value !== "custom") {
                setSelectedUsers([]);
              }
            }}
          />
          <p
            style={{
              marginTop: "4px",
              fontSize: "12px",
              color: "var(--text-color-2)",
            }}
          >
            선택한 대상에게만 새 게시글 알림이 발송됩니다.
          </p>
        </div>

        {/* 사용자 지정 선택 */}
        {targetType === "custom" && (
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              수신자 선택
            </label>
            <Autofill
              appearence="flat"
              options={
                userList.map((user: any) => ({
                  value: JSON.stringify({
                    user: user._id,
                    userId: user.userId,
                    userName: user.userName,
                  }),
                  text: `${user.userName}(${user.userId})`,
                })) || []
              }
              setState={(e: string) => {
                const parsed = JSON.parse(e);
                setSelectedUsers(
                  _.uniqBy([...selectedUsers, parsed], (obj) => obj.userId)
                );
              }}
              placeholder="이름 또는 아이디로 검색"
              resetOnClick
            />
            {selectedUsers.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {selectedUsers.map((user) => (
                  <div
                    key={user.userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      color: "var(--text-color-2)",
                      border: "1px solid var(--border-color)",
                      padding: "4px 8px",
                      fontSize: "12px",
                      borderRadius: "16px",
                      background: "var(--background-color-2)",
                    }}
                  >
                    {`${user.userName}(${user.userId})`}
                    <span
                      style={{
                        marginLeft: "8px",
                        cursor: "pointer",
                        color: "var(--text-color-3)",
                      }}
                      onClick={() => {
                        setSelectedUsers(
                          selectedUsers.filter((u) => u.userId !== user.userId)
                        );
                      }}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
