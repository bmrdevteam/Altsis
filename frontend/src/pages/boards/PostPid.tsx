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

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import style from "style/pages/enrollment.module.scss";

import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import Textarea from "components/textarea/Textarea";
import { MarkdownViewer } from "components/markdown";

import { TPost, TPostAttachment } from "types/post";
import { TBoard } from "types/board";
import { TComment } from "types/comment";

import UserListPopup from "./popup/UserListPopup";
import SurveyViewPopup from "./survey/SurveyViewPopup";
import surveyStyle from "./survey/survey.module.scss";
import ReservationViewPopup from "./reservation/ReservationViewPopup";

const PostPid = () => {
  const navigate = useAppNavigate();
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>();
  const { currentUser, currentRegistration } = useAuth();
  const { PostAPI, CommentAPI, SurveyResponseAPI } = useAPIv2();

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
  const [activeSurveyIndex, setActiveSurveyIndex] = useState<number | null>(null);
  const [showReservationPopup, setShowReservationPopup] = useState(false);

  // 서명 URL 캐시 (다운로드/새 탭 열기용)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const getSignedUrl = async (
    file: TPostAttachment,
    forView = false
  ): Promise<string> => {
    if (!file.key) return file.url;

    const cacheKey = `${file.key}-${forView ? "view" : "download"}`;
    if (signedUrls[cacheKey]) return signedUrls[cacheKey];

    try {
      const { preSignedUrl } = await PostAPI.RSignedUrlPostFile({
        query: {
          key: file.key,
          fileName: file.fileName,
          ...(forView && { view: "true" }),
        },
      });
      setSignedUrls((prev) => ({ ...prev, [cacheKey]: preSignedUrl }));
      return preSignedUrl;
    } catch {
      return file.url;
    }
  };

  // 첨부파일 서명 URL 프리페치 (비이미지 파일용)
  useEffect(() => {
    if (post?.attachments?.length) {
      post.attachments.forEach((file) => {
        if (file.key && !file.mimeType?.startsWith("image/")) {
          getSignedUrl(file, true);
        }
      });
    }
  }, [post?.attachments]);

  // S3 서명 URL → 만료되지 않는 프록시 URL로 변환
  const processedContent = useMemo(() => {
    if (!post?.content) return "";
    return post.content.replace(
      /https?:\/\/[^/\s)]*\.s3\.[^/\s)]*\.amazonaws\.com\/([^?\s)]+\/posts\/[^?\s)]+)\?[^\s)]*/g,
      (_match, key) =>
        `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(key)}`
    );
  }, [post?.content]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const isAuthor = currentUser?._id === post?.author;
  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";
  const canEdit = isAuthor || isManager;

  // 보드 관리 권한 (예약 관리용): 게시글 작성자 또는 보드 관리자
  const canManageBoard = () => {
    if (isAuthor) return true;
    if (isManager) return true;
    if (board?.creator && board.creator === currentUser?._id) return true;
    return false;
  };

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
          <MarkdownViewer content={processedContent} />
        </div>

        {/* 첨부 (파일 + 설문 + 예약 통합) */}
        {((post.attachments && post.attachments.length > 0) ||
          (post.surveys && post.surveys.length > 0) ||
          post.reservationConfig) && (
          <div style={{ marginTop: "24px" }}>
            <div
              style={{ fontWeight: 500, marginBottom: "10px", fontSize: "14px" }}
            >
              첨부 (
              {(post.attachments?.length || 0) +
                (post.surveys?.length || 0) +
                (post.reservationConfig ? 1 : 0)}
              )
            </div>
            <div className={surveyStyle.attachList}>
              {post.attachments?.map((file, idx) => {
                const isImage = file.mimeType?.startsWith("image/");
                const imageUrl = isImage && file.key
                  ? `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(file.key)}`
                  : null;
                return (
                  <div
                    key={idx}
                    className={`${surveyStyle.attachItem} ${surveyStyle.attachItemClickable}`}
                    onClick={async () => {
                      const url = await getSignedUrl(file, true);
                      window.open(url, "_blank");
                    }}
                  >
                    <div className={surveyStyle.attachItemThumbArea}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={file.fileName}
                          className={surveyStyle.attachItemThumb}
                        />
                      ) : (
                        <div className={surveyStyle.attachItemIconLarge}>
                          <Svg type="paperclip" width="24px" height="24px" />
                        </div>
                      )}
                    </div>
                    <div className={surveyStyle.attachItemBody}>
                      <div className={surveyStyle.attachItemInfo}>
                        <span className={surveyStyle.attachItemTitle}>
                          {file.fileName}
                        </span>
                        <span className={surveyStyle.attachItemMeta}>
                          {formatFileSize(file.fileSize)}
                        </span>
                      </div>
                      <span
                        className={surveyStyle.attachItemBtn}
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = await getSignedUrl(file, false);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = file.fileName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        <Svg type="download" width="18px" height="18px" />
                      </span>
                    </div>
                  </div>
                );
              })}
              {post.surveys?.map((survey, idx) => (
                <div
                  key={survey._id || `survey-${idx}`}
                  className={`${surveyStyle.attachItem} ${surveyStyle.attachItemClickable}`}
                  onClick={() => setActiveSurveyIndex(idx)}
                >
                  <div className={surveyStyle.attachItemThumbArea}>
                    <div className={surveyStyle.attachItemIconLarge}>
                      <Svg type="description" width="24px" height="24px" />
                    </div>
                  </div>
                  <div className={surveyStyle.attachItemBody}>
                    <div className={surveyStyle.attachItemInfo}>
                      <span className={surveyStyle.attachItemTitle}>
                        {survey.title || `설문 ${idx + 1}`}
                      </span>
                      <span className={surveyStyle.attachItemMeta}>
                        {survey.questions.length}문항 ·{" "}
                        {survey.responseCount}명 응답
                        {survey.settings.isAnonymous && " · 익명"}
                        {survey.settings.deadline &&
                          new Date() > new Date(survey.settings.deadline) &&
                          " · 마감됨"}
                      </span>
                    </div>
                    <div
                      className={surveyStyle.attachItemActions}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="hover"
                        onClick={async () => {
                          try {
                            const data =
                              await SurveyResponseAPI.ExportSurveyJSON({
                                params: {
                                  postId: post._id,
                                  surveyId: survey._id!,
                                },
                              });
                            const blob = new Blob(
                              [JSON.stringify(data, null, 2)],
                              { type: "application/json" }
                            );
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `${
                              survey.title || "survey"
                            }.json`;
                            link.click();
                            URL.revokeObjectURL(url);
                          } catch (err) {
                            ALERT_ERROR(err);
                          }
                        }}
                        style={{ fontSize: "13px" }}
                      >
                        JSON
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {/* 예약 첨부 항목 */}
              {post.reservationConfig && (
                <div
                  className={`${surveyStyle.attachItem} ${surveyStyle.attachItemClickable}`}
                  onClick={() => setShowReservationPopup(true)}
                >
                  <div className={surveyStyle.attachItemThumbArea}>
                    <div className={surveyStyle.attachItemIconLarge}>
                      <Svg type="eventCalendar" width="24px" height="24px" />
                    </div>
                  </div>
                  <div className={surveyStyle.attachItemBody}>
                    <div className={surveyStyle.attachItemInfo}>
                      <span className={surveyStyle.attachItemTitle}>
                        {post.reservationConfig.resource}
                      </span>
                      <span className={surveyStyle.attachItemMeta}>
                        {post.reservationConfig.totalSlots || 0}개 슬롯
                        {post.reservationConfig.requireApproval
                          ? " · 승인 필요"
                          : " · 자동 승인"}
                        {post.reservationConfig.slotMode === "label"
                          ? " · 라벨 모드"
                          : " · 시간 모드"}
                      </span>
                    </div>
                    <div
                      className={surveyStyle.attachItemActions}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className={surveyStyle.attachItemBtn}>
                        {canManageBoard() ? "관리" : "예약"}
                      </span>
                      {canManageBoard() && (
                        <Button
                          type="hover"
                          onClick={async () => {
                            try {
                              const data =
                                await PostAPI.ExportReservationJSON({
                                  params: { _id: post._id },
                                });
                              const blob = new Blob(
                                [JSON.stringify(data, null, 2)],
                                { type: "application/json" }
                              );
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `${
                                post.reservationConfig!.resource || "reservation"
                              }.json`;
                              link.click();
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              ALERT_ERROR(err);
                            }
                          }}
                          style={{ fontSize: "13px" }}
                        >
                          JSON
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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

      {activeSurveyIndex !== null &&
        post.surveys &&
        post.surveys[activeSurveyIndex] && (
          <SurveyViewPopup
            setState={() => setActiveSurveyIndex(null)}
            post={post}
            surveyIndex={activeSurveyIndex}
            currentUserId={currentUser?._id || ""}
            isAuthor={isAuthor}
            isManager={isManager}
          />
        )}

      {showReservationPopup &&
        post.reservationConfig &&
        board && (
          <ReservationViewPopup
            setState={setShowReservationPopup}
            post={post}
            board={board}
            canManage={canManageBoard()}
          />
        )}
    </>
  );
};

export default PostPid;
