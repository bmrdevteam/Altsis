/**
 * @file Post Detail Page
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

import style from "style/pages/enrollment.module.scss";

import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import Textarea from "components/textarea/Textarea";
import { MarkdownViewer } from "components/markdown";

import { TPost } from "types/post";
import { TBoard } from "types/board";
import { TComment } from "types/comment";

import UserListPopup from "./popup/UserListPopup";

const PostPid = () => {
  const navigate = useAppNavigate();
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>();
  const { currentUser, currentRegistration } = useAuth();
  const { PostAPI, CommentAPI } = useAPIv2();

  const [post, setPost] = useState<TPost | null>(null);
  const [board, setBoard] = useState<TBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReadersPopup, setShowReadersPopup] = useState(false);

  // 댓글 관련 상태
  const [comments, setComments] = useState<TComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  const isAuthor = currentUser?._id === post?.author;
  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";
  const canEdit = isAuthor || isManager;

  // 댓글 작성 권한: 멤버는 댓글 가능
  const canComment = () => {
    // 보드 멤버이면 댓글 가능 (새 구조에서는 permissionComment 삭제)
    return true;
  };

  useEffect(() => {
    if (isLoading && postId) {
      PostAPI.RPost({ params: { _id: postId } })
        .then(({ post, board }) => {
          setPost(post);
          setBoard(board);
          setIsLoading(false);
          setIsCommentsLoading(true);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsLoading(false);
        });
    }
  }, [isLoading, postId]);

  // 댓글 로드
  useEffect(() => {
    if (isCommentsLoading && postId) {
      CommentAPI.RComments({ query: { post: postId } })
        .then(({ comments }) => {
          setComments(comments);
          setIsCommentsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load comments:", err);
          setIsCommentsLoading(false);
        });
    }
  }, [isCommentsLoading, postId]);

  const handleDelete = async () => {
    if (!postId) return;
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      await PostAPI.DPost({ params: { _id: postId } });
      alert("삭제되었습니다.");
      navigate(`/boards/${boardId}`);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handlePin = async () => {
    if (!postId || !post) return;

    try {
      await PostAPI.UPostPin({
        params: { _id: postId },
        data: { isPinned: !post.isPinned },
      });
      setIsLoading(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!postId || !newComment.trim()) return;

    try {
      await CommentAPI.CComment({
        data: {
          post: postId,
          content: newComment.trim(),
        },
      });
      setNewComment("");
      setIsCommentsLoading(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 댓글 수정
  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;

    try {
      await CommentAPI.UComment({
        params: { _id: commentId },
        data: { content: editingCommentContent.trim() },
      });
      setEditingCommentId(null);
      setEditingCommentContent("");
      setIsCommentsLoading(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await CommentAPI.DComment({ params: { _id: commentId } });
      setIsCommentsLoading(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 댓글 수정 시작
  const startEditingComment = (comment: TComment) => {
    setEditingCommentId(comment._id);
    setEditingCommentContent(comment.content);
  };

  // 댓글 수정 취소
  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  if (!post) {
    return (
      <div className={style.section}>
        <p>게시글을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      <div className={style.section}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
            onClick={() => navigate(`/boards/${boardId}`)}
          >
            <Svg type="chevronLeft" width="24px" height="24px" />
          </div>
          <div className={style.title} style={{ margin: 0 }}>
            {post.isPinned && (
              <span style={{ color: "var(--accent-1)" }}>[공지] </span>
            )}
            {post.title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderBottom: "var(--border-default)",
            marginBottom: "24px",
            color: "var(--text-color-2)",
            fontSize: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "var(--background-color-2)",
                backgroundImage: post.authorProfile
                  ? `url(${post.authorProfile})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                marginRight: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "var(--text-color-2)",
                flexShrink: 0,
              }}
            >
              {!post.authorProfile && post.authorName?.charAt(0)}
            </div>
            <span>
              {post.authorName}({post.authorId})
            </span>
            <span style={{ margin: "0 8px" }}>|</span>
            <span>{formatDate(post.createdAt)}</span>
            <span style={{ margin: "0 8px" }}>|</span>
            <span>조회 {post.viewCount}</span>
            {!post.isLegacyNotification && (
              <>
                <span style={{ margin: "0 8px" }}>|</span>
                <span
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setShowReadersPopup(true)}
                >
                  열람 대상
                </span>
              </>
            )}
          </div>

          {canEdit && (
            <div style={{ display: "flex", gap: "8px" }}>
              {isManager && !post.isLegacyNotification && (
                <Button type="hover" onClick={handlePin}>
                  {post.isPinned ? "고정 해제" : "고정"}
                </Button>
              )}
              {!post.isLegacyNotification && (
                <Button
                  type="hover"
                  onClick={() => navigate(`/boards/${boardId}/edit/${postId}`)}
                >
                  수정
                </Button>
              )}
              <Button type="hover" onClick={handleDelete}>
                삭제
              </Button>
            </div>
          )}
        </div>

        <div style={{ minHeight: "300px" }}>
          <MarkdownViewer content={post.content} />
        </div>

        {post.attachments && post.attachments.length > 0 && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "var(--background-color-2)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{ fontWeight: 500, marginBottom: "12px", fontSize: "14px" }}
            >
              첨부파일 ({post.attachments.length})
            </div>
            {post.attachments.map((file, idx) => (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  color: "var(--accent-1)",
                  marginBottom: "4px",
                  fontSize: "14px",
                }}
              >
                {file.fileName} ({Math.round(file.fileSize / 1024)}KB)
              </a>
            ))}
          </div>
        )}

        {/* 댓글 섹션 */}
        <div
          style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "var(--border-default)",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: "16px",
              marginBottom: "16px",
            }}
          >
            댓글 {comments.length > 0 && `(${comments.length})`}
          </div>

          {/* 댓글 목록 */}
          <div style={{ marginBottom: "16px" }}>
            {comments.length === 0 && !isCommentsLoading && (
              <p style={{ color: "var(--text-color-2)", fontSize: "14px" }}>
                첫 번째 댓글을 작성해보세요.
              </p>
            )}
            {comments.map((comment) => {
              const isCommentAuthor = currentUser?._id === comment.author;
              const canEditComment = isCommentAuthor || isManager;

              return (
                <div
                  key={comment._id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: "var(--background-color-2)",
                          backgroundImage: comment.authorProfile
                            ? `url(${comment.authorProfile})`
                            : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          marginRight: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          color: "var(--text-color-2)",
                        }}
                      >
                        {!comment.authorProfile && comment.authorName?.charAt(0)}
                      </div>
                      <div>
                        <span style={{ fontWeight: 500, fontSize: "14px" }}>
                          {comment.authorName}
                        </span>
                        <span
                          style={{
                            color: "var(--text-color-2)",
                            fontSize: "12px",
                            marginLeft: "4px",
                          }}
                        >
                          ({comment.authorId})
                        </span>
                        <span
                          style={{
                            color: "var(--text-color-2)",
                            fontSize: "12px",
                            marginLeft: "8px",
                          }}
                        >
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                    </div>
                    {canEditComment && editingCommentId !== comment._id && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-color-2)",
                            cursor: "pointer",
                          }}
                          onClick={() => startEditingComment(comment)}
                        >
                          수정
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-color-2)",
                            cursor: "pointer",
                          }}
                          onClick={() => handleDeleteComment(comment._id)}
                        >
                          삭제
                        </span>
                      </div>
                    )}
                  </div>

                  {editingCommentId === comment._id ? (
                    <div>
                      <Textarea
                        defaultValue={editingCommentContent}
                        onChange={(e: any) =>
                          setEditingCommentContent(e.target.value)
                        }
                        style={{ marginBottom: "8px" }}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                          type="ghost"
                          onClick={() => handleUpdateComment(comment._id)}
                          style={{ padding: "4px 12px", fontSize: "13px" }}
                        >
                          저장
                        </Button>
                        <Button
                          type="hover"
                          onClick={cancelEditingComment}
                          style={{ padding: "4px 12px", fontSize: "13px" }}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p
                      style={{
                        fontSize: "14px",
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {comment.content}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* 댓글 작성 */}
          {canComment() && (
            <div>
              <Textarea
                placeholder="댓글을 입력하세요"
                defaultValue={newComment}
                onChange={(e: any) => setNewComment(e.target.value)}
                style={{ marginBottom: "8px" }}
              />
              <Button
                type="ghost"
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
              >
                댓글 작성
              </Button>
            </div>
          )}
        </div>

        <div style={{ marginTop: "24px" }}>
          <Button type="ghost" onClick={() => navigate(`/boards/${boardId}`)}>
            목록으로
          </Button>
        </div>
      </div>

      {showReadersPopup && postId && (
        <UserListPopup
          title="열람 대상"
          setState={setShowReadersPopup}
          fetchUsers={() =>
            PostAPI.RPostReaders({ params: { _id: postId } })
          }
        />
      )}
    </>
  );
};

export default PostPid;
