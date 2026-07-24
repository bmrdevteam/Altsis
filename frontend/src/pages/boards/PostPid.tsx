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

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import style from "style/pages/enrollment.module.scss";
import abStyle from "./altBoard/altBoard.module.scss";

import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import Textarea from "components/textarea/Textarea";
import { MarkdownViewer } from "components/markdown";

import { TPost, TPostAttachment } from "types/post";
import { TBoard } from "types/board";
import { TComment } from "types/comment";
import { DateRange } from "components/dateRangeFilter/DateRangeFilterDropdown";
import MergeStyleFilterBar from "components/mergeFilter/MergeStyleFilterBar";

import UserListPopup from "./popup/UserListPopup";
import SurveyViewPopup from "./survey/SurveyViewPopup";
import surveyStyle from "./survey/survey.module.scss";
const PostPid = () => {
  const navigate = useAppNavigate();
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>();
  const { currentUser } = useAuth();
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

  // 머지 필터: 키워드 검색 + 세부 필드 필터
  const [mergeKeyword, setMergeKeyword] = useState("");
  const [mergeFilters, setMergeFilters] = useState<Record<string, string>>({});
  const [mergeDateFilters, setMergeDateFilters] = useState<
    Record<string, DateRange>
  >({});

  // OG 이미지 로드 실패 추적
  const [brokenOgImages, setBrokenOgImages] = useState<Set<number>>(new Set());
  // 서명 URL 캐시 (다운로드/새 탭 열기용)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // HTML 임베드 미리보기
  const [htmlEmbedPreview, setHtmlEmbedPreview] = useState<TPostAttachment | null>(null);

  // 머지 인라인 입력

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

  // 댓글 작성 권한: 멤버는 댓글 가능
  const canComment = () => {
    // 보드 멤버이면 댓글 가능 (새 구조에서는 permissionComment 삭제)
    return true;
  };

  const buildMergeQuery = (
    keyword: string,
    filters: Record<string, string>,
    dateFilters: Record<string, DateRange>
  ) => {
    const query: Record<string, string> = { merge: "true" };
    const activeFilters: Record<string, any> = {};
    if (keyword.trim()) activeFilters._keyword = keyword.trim();
    for (const [key, value] of Object.entries(filters)) {
      if (value) activeFilters[key] = value;
    }
    for (const [key, range] of Object.entries(dateFilters)) {
      if (range.from || range.to) activeFilters[key] = range;
    }
    if (Object.keys(activeFilters).length > 0) {
      query.filters = JSON.stringify(activeFilters);
    }
    return query;
  };

  useEffect(() => {
    if (isLoading && postId) {
      PostAPI.RPost({
        params: { _id: postId },
        query: buildMergeQuery(mergeKeyword, mergeFilters, mergeDateFilters),
      })
        .then(({ post, board: loadedBoard }) => {
          setPost(post);
          setBoard(loadedBoard);
          setIsLoading(false);
          setIsCommentsLoading(true);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsLoading(false);
        });
    }
  }, [isLoading, postId]);

  // 필터 변경 시 머지 재조회
  const mergeFilterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchMerge = (
    keyword: string,
    textFilters: Record<string, string>,
    dateFilters: Record<string, DateRange>
  ) => {
    if (mergeFilterTimerRef.current) clearTimeout(mergeFilterTimerRef.current);
    mergeFilterTimerRef.current = setTimeout(() => {
      if (!postId) return;
      PostAPI.RPost({
        params: { _id: postId },
        query: buildMergeQuery(keyword, textFilters, dateFilters),
      })
        .then(({ post: updatedPost }) => {
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  content: updatedPost.content,
                  _mergeFields: updatedPost._mergeFields ?? prev._mergeFields,
                  _mergeApplied: updatedPost._mergeApplied ?? prev._mergeApplied,
                }
              : prev
          );
        })
        .catch((err) => ALERT_ERROR(err));
    }, 400);
  };

  const handleMergeKeywordChange = (value: string) => {
    setMergeKeyword(value);
    refetchMerge(value, mergeFilters, mergeDateFilters);
  };

  const handleMergeFilterChange = (label: string, value: string) => {
    const next = { ...mergeFilters, [label]: value };
    setMergeFilters(next);
    refetchMerge(mergeKeyword, next, mergeDateFilters);
  };

  const handleMergeDateFilterChange = (label: string, range: DateRange) => {
    const next = { ...mergeDateFilters, [label]: range };
    setMergeDateFilters(next);
    refetchMerge(mergeKeyword, mergeFilters, next);
  };

  const clearMergeFilters = () => {
    setMergeKeyword("");
    setMergeFilters({});
    setMergeDateFilters({});
    if (!postId) return;
    PostAPI.RPost({
      params: { _id: postId },
      query: { merge: "true" },
    })
      .then(({ post: updatedPost }) => {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                content: updatedPost.content,
                _mergeFields: updatedPost._mergeFields ?? prev._mergeFields,
              }
            : prev
        );
      })
      .catch((err) => ALERT_ERROR(err));
  };

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
      navigate(`/boards/${boardId}#문서`);
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
            onClick={() => navigate(`/boards/${boardId}#문서`)}
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
            <span
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => setShowReadersPopup(true)}
            >
              열람 대상
            </span>
          </div>

          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <button
              type="button"
              className={abStyle.formCardIconBtn}
              title="다운로드"
              onClick={() => {
                const raw = (post as any)._rawContent || post.content || "";
                const blob = new Blob([raw], {
                  type: "text/markdown;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${(post.title || "document").replace(/[/\\?%*:|"<>]/g, "_")}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Svg type="download" width="20px" height="20px" />
            </button>
            {canEdit && (
              <>
                {isManager && (
                  <button
                    type="button"
                    className={`${abStyle.formCardIconBtn} ${
                      post.isPinned ? abStyle.formCardIconBtnActive : ""
                    }`}
                    title={post.isPinned ? "고정 해제" : "고정"}
                    onClick={handlePin}
                  >
                    <Svg
                      type={post.isPinned ? "pinOff" : "pin"}
                      width="20px"
                      height="20px"
                    />
                  </button>
                )}
                <button
                  type="button"
                  className={abStyle.formCardIconBtn}
                  title="문서 수정"
                  onClick={() =>
                    navigate(`/boards/${boardId}/edit/${postId}`)
                  }
                >
                  <Svg type="write" width="20px" height="20px" />
                </button>
                <button
                  type="button"
                  className={`${abStyle.formCardIconBtn} ${abStyle.formCardIconBtnDanger}`}
                  title="삭제"
                  onClick={handleDelete}
                >
                  <Svg type="trash" width="20px" height="20px" />
                </button>
              </>
            )}
          </div>
        </div>

        {(canEdit && (post._mergeStripped || post._mergeTruncated)) && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 12px",
              background: "var(--background-color-2)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "var(--text-color-2)",
            }}
          >
            {post._mergeStripped &&
              "미지원 머지 문법(입력 form/input·조건·그룹·집계)이 문서에서 제거된 뒤 표시되었습니다. "}
            {post._mergeTruncated &&
              "데이터가 많아 일부 행·출력만 표시되었습니다."}
          </div>
        )}

        {/* 머지 검색 + 세부 필터 */}
        {post._mergeApplied && post._mergeFields && post._mergeFields.length > 0 && (
          <MergeStyleFilterBar
            keyword={mergeKeyword}
            onKeywordChange={handleMergeKeywordChange}
            keywordPlaceholder="키워드 검색 (이름, 강의실, 목적 등)"
            textFilters={mergeFilters}
            onTextFilterChange={handleMergeFilterChange}
            dateFilters={mergeDateFilters}
            onDateFilterChange={handleMergeDateFilterChange}
            fields={post._mergeFields.map((field) => ({
              key: field.label,
              label: field.label,
              type: field.type,
            }))}
            onClear={clearMergeFilters}
          />
        )}

        <div style={{ minHeight: "300px" }}>
          <MarkdownViewer content={processedContent} />
        </div>

        {/* 첨부 (파일 + 설문) */}
        {((post.attachments && post.attachments.length > 0) ||
          (post.surveys && post.surveys.length > 0)) && (
          <div style={{ marginTop: "24px" }}>
            <div
              style={{ fontWeight: 500, marginBottom: "10px", fontSize: "14px" }}
            >
              첨부 (
              {(post.attachments?.length || 0) +
                (post.surveys?.length || 0)}
              )
            </div>
            <div className={surveyStyle.attachList}>
              {post.attachments?.map((file, idx) => {
                const attachType = file.type || "file";
                const isImage =
                  attachType === "file" &&
                  file.mimeType?.startsWith("image/");
                const isLink = attachType === "link";
                const isYoutube = attachType === "youtube";
                const isHtmlEmbed = attachType === "htmlEmbed";

                // 썸네일 결정
                const ogImageOk =
                  (isYoutube || isLink || isHtmlEmbed) &&
                  file.ogImage &&
                  !brokenOgImages.has(idx);

                let thumbnailContent: React.ReactNode;
                if (ogImageOk) {
                  thumbnailContent = (
                    <img
                      src={file.ogImage}
                      alt=""
                      className={surveyStyle.attachItemThumb}
                      onError={() =>
                        setBrokenOgImages((prev) => new Set(prev).add(idx))
                      }
                    />
                  );
                } else if (isImage && file.key) {
                  const imageUrl = `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(file.key)}`;
                  thumbnailContent = (
                    <img
                      src={imageUrl}
                      alt={file.fileName}
                      className={surveyStyle.attachItemThumb}
                    />
                  );
                } else {
                  const iconType = isHtmlEmbed
                    ? "htmlEmbed"
                    : isYoutube
                    ? "youtube"
                    : isLink
                    ? "linkExternal"
                    : "paperclip";
                  thumbnailContent = (
                    <div className={surveyStyle.attachItemIconLarge}>
                      <Svg type={iconType} width="24px" height="24px" />
                    </div>
                  );
                }

                // 제목 및 메타 정보
                const displayTitle = isHtmlEmbed
                  ? file.ogTitle || file.fileName || "HTML 임베드"
                  : isLink
                  ? file.ogTitle || file.url
                  : isYoutube
                  ? file.ogTitle || file.fileName
                  : file.fileName;

                let displayMeta: string;
                if (isHtmlEmbed) {
                  if (file.ogDescription) {
                    displayMeta = file.ogDescription;
                  } else if (file.embedType === "code") {
                    displayMeta = `HTML 코드 (${formatFileSize(file.fileSize)})`;
                  } else {
                    displayMeta = file.url || "HTML URL";
                  }
                } else if (isLink) {
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

                // 클릭 동작
                const handleClick = async () => {
                  if (isHtmlEmbed) {
                    setHtmlEmbedPreview(file);
                  } else if (isLink || isYoutube) {
                    window.open(file.url, "_blank", "noopener,noreferrer");
                  } else {
                    const url = await getSignedUrl(file, true);
                    window.open(url, "_blank");
                  }
                };

                return (
                  <div
                    key={idx}
                    className={`${surveyStyle.attachItem} ${surveyStyle.attachItemClickable}`}
                    onClick={handleClick}
                  >
                    <div className={surveyStyle.attachItemThumbArea}>
                      {thumbnailContent}
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
                      {/* 파일: 다운로드 버튼, 링크/YouTube: 외부 링크 아이콘, HTML 임베드: 보기 아이콘 */}
                      {isHtmlEmbed ? (
                        <span
                          className={surveyStyle.attachItemBtn}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <Svg
                            type="htmlEmbed"
                            width="18px"
                            height="18px"
                          />
                        </span>
                      ) : isLink || isYoutube ? (
                        <span
                          className={surveyStyle.attachItemBtn}
                          style={{ display: "flex", alignItems: "center" }}
                        >
                          <Svg
                            type="linkExternal"
                            width="18px"
                            height="18px"
                          />
                        </span>
                      ) : (
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
                      )}
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
          <Button
            type="ghost"
            onClick={() => navigate(`/boards/${boardId}#문서`)}
          >
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

      {/* HTML 임베드 미리보기 오버레이 */}
      {htmlEmbedPreview && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              backgroundColor: "var(--background-color)",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <span style={{ fontWeight: 500, fontSize: "14px" }}>
              {htmlEmbedPreview.embedType === "url"
                ? htmlEmbedPreview.url
                : "HTML 임베드"}
            </span>
            <button
              type="button"
              onClick={() => setHtmlEmbedPreview(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "20px",
                color: "var(--accent-1)",
              }}
            >
              ✕
            </button>
          </div>
          <iframe
            sandbox="allow-scripts"
            style={{
              flex: 1,
              width: "100%",
              border: "none",
              backgroundColor: "#fff",
            }}
            srcDoc={
              htmlEmbedPreview.embedType === "code" && htmlEmbedPreview.htmlContent
                ? htmlEmbedPreview.htmlContent
                : undefined
            }
            src={
              htmlEmbedPreview.embedType === "url"
                ? htmlEmbedPreview.url
                : undefined
            }
            title="HTML 임베드 미리보기"
          />
        </div>
      )}

    </>
  );
};

export default PostPid;
