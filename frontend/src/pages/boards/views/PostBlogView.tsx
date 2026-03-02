import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TPost, TPostAttachment } from "types/post";
import { TBoard } from "types/board";
import { TComment } from "types/comment";
import { MarkdownViewer } from "components/markdown";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Svg from "assets/svg/Svg";

import style from "./postBlogView.module.scss";
import surveyStyle from "../survey/survey.module.scss";
import SurveyViewPopup from "../survey/SurveyViewPopup";

const PAGE_SIZE = 10;
const CONTENT_TRUNCATE_HEIGHT = 200;

type Props = {
  posts: TPost[];
  board: TBoard;
  onClickPost: (post: TPost) => void;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

// S3 서명 URL → 만료되지 않는 리다이렉트 URL로 변환
const processContent = (content: string): string => {
  if (!content) return "";
  return content.replace(
    /https?:\/\/[^/\s)]*\.s3\.[^/\s)]*\.amazonaws\.com\/([^?\s)]+\/posts\/[^?\s)]+)\?[^\s)]*/g,
    (_match, key) =>
      `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(key)}`
  );
};

const getProxyUrl = (file: TPostAttachment) => {
  if (file.key) {
    return `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(file.key)}`;
  }
  return file.url;
};

/* ═══════════════════════════════════════════
   PostStreamCard — 개별 게시글 카드
   ═══════════════════════════════════════════ */

type PostStreamCardProps = {
  post: TPost;
  board: TBoard;
  commentCount: number;
  onClickPost: (post: TPost) => void;
  onCommentCountChange: (postId: string, delta: number, absolute?: number) => void;
};

const PostStreamCard = ({
  post,
  board,
  commentCount,
  onClickPost,
  onCommentCountChange,
}: PostStreamCardProps) => {
  const { currentUser } = useAuth();
  const { CommentAPI } = useAPIv2();

  // 콘텐츠 truncation
  const contentRef = useRef<HTMLDivElement>(null);
  const [isContentOverflow, setIsContentOverflow] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // 댓글
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<TComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 팝업
  const [activeSurveyIndex, setActiveSurveyIndex] = useState<number | null>(
    null
  );

  const processedContent = useMemo(
    () => processContent(post.content),
    [post.content]
  );

  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";
  const canManage =
    isManager ||
    (board.creator && board.creator === currentUser?._id) ||
    post.author === currentUser?._id;

  // 콘텐츠 높이 체크
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const check = () =>
      setIsContentOverflow(el.scrollHeight > CONTENT_TRUNCATE_HEIGHT);
    check();

    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [post.content]);

  // 댓글 로드 (showComments가 true가 되면 항상 서버에서 로드)
  useEffect(() => {
    if (showComments) {
      setIsCommentsLoading(true);
      CommentAPI.RComments({ query: { post: post._id } })
        .then(({ comments: loaded }) => {
          setComments(loaded);
          onCommentCountChange(post._id, 0, loaded.length);
        })
        .catch(console.error)
        .finally(() => setIsCommentsLoading(false));
    }
  }, [showComments]);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { comment } = await CommentAPI.CComment({
        data: { post: post._id, content: newComment.trim() },
      });
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      onCommentCountChange(post._id, 1);
      if (!showComments) setShowComments(true);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, isSubmitting, post._id, showComments]);

  const hasAttachments =
    (post.attachments && post.attachments.length > 0) ||
    (post.surveys && post.surveys.length > 0);

  return (
    <div className={style.card}>
      <div className={style.cardBody}>
      {/* 작성자 */}
      <div className={style.authorRow}>
        <div
          className={style.authorAvatar}
          style={
            post.authorProfile
              ? { backgroundImage: `url(${post.authorProfile})` }
              : undefined
          }
        >
          {!post.authorProfile && post.authorName?.charAt(0)}
        </div>
        <span>{post.authorName}</span>
        <span className={style.dot}>·</span>
        <span>{formatDate(post.createdAt)}</span>
      </div>

      {/* 헤더: 뱃지 + 제목 */}
      <div className={style.cardHeader}>
        <div>
          {post.isPinned && (
            <span className={style.pinnedBadge}>[공지]</span>
          )}
          <div
            className={style.cardTitle}
            onClick={() => onClickPost(post)}
          >
            {post.title}
          </div>
        </div>
      </div>

      {/* 본문 */}
      {post.content && (
        <>
          <div
            ref={contentRef}
            className={`${style.contentWrapper} ${
              isContentOverflow && !isContentExpanded
                ? style.contentTruncated
                : ""
            }`}
          >
            <MarkdownViewer content={processedContent} />
          </div>
          {isContentOverflow && (
            <button
              className={style.expandBtn}
              onClick={() => setIsContentExpanded(!isContentExpanded)}
            >
              {isContentExpanded ? "접기" : "더 보기"}
            </button>
          )}
        </>
      )}

      {/* 첨부 카드 */}
      {hasAttachments && (
        <div className={style.attachmentSection}>
          {/* 파일/링크/YouTube 첨부 */}
          {post.attachments?.map((file, idx) => {
            const attachType = file.type || "file";
            const isImage =
              attachType === "file" &&
              file.mimeType?.startsWith("image/");
            const isLink = attachType === "link";
            const isYoutube = attachType === "youtube";

            // 썸네일
            let thumbContent: React.ReactNode;
            if ((isYoutube || isLink) && file.ogImage) {
              thumbContent = (
                <img
                  src={file.ogImage}
                  alt=""
                  className={surveyStyle.attachItemThumb}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                    if (sibling) sibling.style.display = "flex";
                  }}
                />
              );
            } else if (isImage) {
              thumbContent = (
                <img
                  src={getProxyUrl(file)}
                  alt={file.fileName}
                  className={surveyStyle.attachItemThumb}
                />
              );
            }

            const iconType = isYoutube
              ? "youtube"
              : isLink
              ? "linkExternal"
              : "paperclip";

            // 제목/메타
            const displayTitle = isLink
              ? file.ogTitle || file.url
              : isYoutube
              ? file.ogTitle || file.fileName
              : file.fileName;

            let displayMeta: string;
            if (isLink) {
              try {
                displayMeta =
                  file.ogDescription || new URL(file.url).hostname;
              } catch {
                displayMeta = file.url;
              }
            } else if (isYoutube) {
              displayMeta = "YouTube";
            } else {
              displayMeta = formatFileSize(file.fileSize);
            }

            return (
              <div
                key={idx}
                className={`${surveyStyle.attachItem} ${surveyStyle.attachItemClickable}`}
                onClick={() => {
                  if (isLink || isYoutube) {
                    window.open(file.url, "_blank", "noopener,noreferrer");
                  } else {
                    window.open(getProxyUrl(file), "_blank");
                  }
                }}
              >
                <div className={surveyStyle.attachItemThumbArea}>
                  {thumbContent}
                  <div
                    className={surveyStyle.attachItemIconLarge}
                    style={thumbContent ? { display: "none" } : undefined}
                  >
                    <Svg type={iconType} width="24px" height="24px" />
                  </div>
                </div>
                <div className={surveyStyle.attachItemBody}>
                  <div className={surveyStyle.attachItemInfo}>
                    <span className={surveyStyle.attachItemTitle}>
                      {displayTitle}
                    </span>
                    <span className={surveyStyle.attachItemMeta}>
                      {displayMeta}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 설문 첨부 */}
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
                    {survey.questions.length}문항 · {survey.responseCount}명
                    응답
                    {survey.settings.isAnonymous && " · 익명"}
                    {survey.settings.deadline &&
                      new Date() > new Date(survey.settings.deadline) &&
                      " · 마감됨"}
                  </span>
                </div>
              </div>
            </div>
          ))}

        </div>
      )}

      </div>{/* end cardBody */}

      {/* 푸터: 댓글 */}
      <div className={style.cardFooter} onClick={() => setShowComments(!showComments)}>
        <div className={style.footerLeft}>
          <span className={style.commentToggleBtn}>
            <Svg type="chatBubble" width="14px" height="14px" />
            댓글 {commentCount}
          </span>
        </div>
      </div>

      {/* 댓글 섹션 */}
      <div className={style.commentSection}>

        {/* 댓글 목록 + 입력 (토글) */}
        {showComments && (
          <>
            <div className={style.commentList}>
              {isCommentsLoading && (
                <div className={style.commentLoading}>
                  댓글을 불러오는 중...
                </div>
              )}
              {!isCommentsLoading && comments.length === 0 && (
                <div className={style.commentLoading}>
                  첫 번째 댓글을 작성해보세요.
                </div>
              )}
              {comments.map((comment) => (
                <div key={comment._id} className={style.commentItem}>
                  <div
                    className={style.commentAvatar}
                    style={
                      comment.authorProfile
                        ? {
                            backgroundImage: `url(${comment.authorProfile})`,
                          }
                        : undefined
                    }
                  >
                    {!comment.authorProfile && comment.authorName?.charAt(0)}
                  </div>
                  <div className={style.commentContent}>
                    <div>
                      <span className={style.commentAuthor}>
                        {comment.authorName}
                      </span>
                      <span className={style.commentDate}>
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <div className={style.commentText}>{comment.content}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 댓글 입력 */}
            {currentUser && (
              <div className={style.commentInputRow}>
                <div
                  className={style.commentAvatar}
                  style={
                    currentUser.profile
                      ? { backgroundImage: `url(${currentUser.profile})` }
                      : undefined
                  }
                >
                  {!currentUser.profile && currentUser.userName?.charAt(0)}
                </div>
                <input
                  className={style.commentInput}
                  placeholder="댓글을 입력하세요..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  disabled={isSubmitting}
                />
                <button
                  className={style.commentSendBtn}
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  <Svg type="send" width="18px" height="18px" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 설문 팝업 */}
      {activeSurveyIndex !== null &&
        post.surveys?.[activeSurveyIndex] && (
          <SurveyViewPopup
            setState={() => setActiveSurveyIndex(null)}
            post={post}
            surveyIndex={activeSurveyIndex}
            currentUserId={currentUser?._id || ""}
            isAuthor={currentUser?._id === post.author}
            isManager={isManager}
          />
        )}

    </div>
  );
};

/* ═══════════════════════════════════════════
   PostBlogView — 스트림 컨테이너
   ═══════════════════════════════════════════ */

const PostBlogView = ({ posts, board, onClickPost }: Props) => {
  const { CommentAPI } = useAPIv2();
  const [page, setPage] = useState(0);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {}
  );

  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  const pagedPosts = posts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // 현재 페이지 게시글의 댓글 수 일괄 조회
  useEffect(() => {
    const postIds = pagedPosts.map((p) => p._id).join(",");
    if (!postIds) return;

    CommentAPI.RCommentCounts({ query: { posts: postIds } })
      .then(({ counts }) => {
        setCommentCounts((prev) => ({ ...prev, ...counts }));
      })
      .catch(console.error);
  }, [page, posts]);

  const handleCommentCountChange = useCallback(
    (postId: string, delta: number, absolute?: number) => {
      setCommentCounts((prev) => ({
        ...prev,
        [postId]: absolute !== undefined ? absolute : (prev[postId] || 0) + delta,
      }));
    },
    []
  );

  if (posts.length === 0) {
    return <div className={style.empty}>게시글이 없습니다.</div>;
  }

  return (
    <div className={style.container}>
      {pagedPosts.map((post) => (
        <PostStreamCard
          key={post._id}
          post={post}
          board={board}
          commentCount={commentCounts[post._id] || 0}
          onClickPost={onClickPost}
          onCommentCountChange={handleCommentCountChange}
        />
      ))}

      {totalPages > 1 && (
        <div className={style.pagination}>
          <button
            className={style.pageBtn}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`${style.pageBtn} ${
                i === page ? style.pageBtnActive : ""
              }`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className={style.pageBtn}
            disabled={page === totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default PostBlogView;
