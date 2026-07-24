import { useEffect, useRef, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import style from "./altBoard.module.scss";
import Svg from "assets/svg/Svg";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import PostBlogView from "../views/PostBlogView";
import { TBoard, TBoardContentViewMode } from "types/board";
import { TPost } from "types/post";

type Props = {
  board: TBoard;
  /** 문서 목록/삭제 등 변경 후 안 읽음 뱃지 갱신 */
  onPostsChanged?: () => void;
};

const formatPermissionRead = (post: TPost): string => {
  if (post.permissionRead?.users && post.permissionRead.users.length > 0) {
    return `지정(${post.permissionRead.users.length}명)`;
  }
  if (post.targetAudience) {
    switch (post.targetAudience.type) {
      case "manager":
        return "관리자";
      case "teacher":
        return "교사";
      case "student":
        return "학생";
      case "custom":
        return "지정";
      default:
        return "전체";
    }
  }
  return "전체";
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const AltDocsView = ({ board, onPostsChanged }: Props) => {
  const navigate = useAppNavigate();
  const { currentUser } = useAuth();
  const { PostAPI } = useAPIv2();

  const [posts, setPosts] = useState<TPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePost, setDeletePost] = useState<TPost | null>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  const contentViewMode: TBoardContentViewMode =
    board.contentViewMode || "table";

  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const canWrite = () => {
    if (!board) return false;
    if (currentUser?.auth === "admin") return true;
    if (currentUser?.auth === "manager") return true;
    if (board.creator && board.creator === currentUser?._id) return true;
    if (
      board.writers?.users?.some((u) => u.userId === currentUser?.userId)
    )
      return true;
    const role = board.altBoardRole?.[currentUser?._id || ""];
    if (role === "admin" || role === "writer") return true;
    return false;
  };

  const canEditPost = (post: TPost) => {
    if (isManager) return true;
    return post.author === currentUser?._id;
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const needsContent = contentViewMode === "blog";
      const { posts: loadedPosts } = await PostAPI.RPosts({
        query: {
          board: board._id,
          ...(needsContent && { includeContent: "true" }),
        },
      });

      // 블로그 뷰: 템플릿 변수가 있는 게시글은 merge 적용
      if (needsContent) {
        const merged = await Promise.all(
          loadedPosts.map(async (p) => {
            if (p.content?.includes("{{#sheet")) {
              try {
                const { post: mergedPost } = await PostAPI.RPost({
                  params: { _id: p._id },
                  query: { merge: "true", skipRead: "true" },
                });
                return { ...p, content: mergedPost.content };
              } catch {
                return p;
              }
            }
            return p;
          })
        );
        setPosts(merged);
      } else {
        setPosts(loadedPosts);
      }
    } catch (err) {
      ALERT_ERROR(err);
    }
    setIsLoading(false);
    onPostsChanged?.();
  };

  useEffect(() => {
    loadPosts();
  }, [board._id, contentViewMode]);

  const handleDuplicate = async (postId: string) => {
    try {
      await PostAPI.DuplicatePost({ params: { _id: postId } });
      loadPosts();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDownloadMd = async (post: TPost) => {
    try {
      const { post: fullPost } = await PostAPI.RPost({
        params: { _id: post._id },
        query: { merge: "true" },
      });
      const content = fullPost.content || "";
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${post.title || "문서"}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletePost) return;
    setIsDeleting(true);
    try {
      await PostAPI.DPost({ params: { _id: deletePost._id } });
      setDeletePost(null);
      loadPosts();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClickPost = (post: TPost) => {
    navigate(`/boards/${board._id}/post/${post._id}`);
  };

  const handleImportMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const baseName = file.name.replace(/\.(md|markdown|txt)$/i, "");
      navigate(`/boards/${board._id}/create`, {
        state: {
          importedMarkdown: text,
          importedTitle: baseName || "",
        },
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (isLoading) return null;

  const pinnedCount = posts.filter((p) => p.isPinned).length;

  const docsHeader = (
    <div className={style.formSectionHeaderStatic}>
      <div className={style.formSectionHeaderMain}>
        <h3 className={style.formSectionTitle}>문서</h3>
        <span className={style.formSectionCount}>{posts.length}</span>
      </div>
      <div className={style.formSectionStats}>
        {pinnedCount > 0 && (
          <span>
            공지 <strong>{pinnedCount}</strong>
          </span>
        )}
      </div>
      {canWrite() && (
        <div className={style.formListToolbar}>
          <button
            type="button"
            className={style.formCardIconBtn}
            title="글쓰기"
            onClick={() => navigate(`/boards/${board._id}/create`)}
          >
            <Svg type="plus" width="20px" height="20px" />
          </button>
          <button
            type="button"
            className={style.formCardIconBtn}
            title="마크다운 파일로 문서 만들기 (.md)"
            onClick={() => mdFileInputRef.current?.click()}
          >
            <Svg type="upload" width="20px" height="20px" />
          </button>
          <input
            ref={mdFileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            style={{ display: "none" }}
            onChange={handleImportMarkdown}
          />
        </div>
      )}
    </div>
  );

  const deletePopup = deletePost ? (
    <Popup
      title="문서 삭제"
      setState={(v: boolean) => {
        if (!v && !isDeleting) setDeletePost(null);
      }}
      closeBtn={!isDeleting}
      style={{ maxWidth: "420px", width: "100%" }}
      footer={
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <Button
            type="ghost"
            onClick={() => setDeletePost(null)}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            type="ghost"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            style={{ color: "var(--status-error)" }}
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      }
    >
      <div style={{ padding: "8px 4px", lineHeight: 1.6 }}>
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--status-error-bg)",
            color: "var(--status-error)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          경고: 삭제하면 복구할 수 없습니다.
        </div>
        <strong>{deletePost.title || "문서"}</strong> 문서를 정말
        삭제하시겠습니까?
        <br />
        <span style={{ color: "var(--text-color-2)", fontSize: 13 }}>
          이 작업은 되돌릴 수 없습니다. 공개 문서는 먼저 비공개로 전환한 뒤
          삭제할 수 있습니다.
        </span>
      </div>
    </Popup>
  ) : null;

  if (contentViewMode === "blog") {
    return (
      <div className={style.formList}>
        <section className={style.formSectionPanel}>
          {docsHeader}
          <div className={style.formSectionBody}>
            {posts.length === 0 ? (
              <div className={style.emptyState}>아직 작성된 문서가 없습니다.</div>
            ) : (
              <div style={{ paddingTop: 12 }}>
                <PostBlogView
                  posts={posts}
                  board={board}
                  onClickPost={handleClickPost}
                />
              </div>
            )}
          </div>
        </section>
        {deletePopup}
      </div>
    );
  }

  return (
    <div className={style.formList}>
      <section className={style.formSectionPanel}>
        {docsHeader}
        <div className={style.formSectionBody}>
          {posts.length === 0 ? (
            <div className={style.emptyState}>아직 작성된 문서가 없습니다.</div>
          ) : (
            <div className={style.formCardList}>
              {posts.map((post) => {
                const editable = canEditPost(post);
                return (
                  <div
                    key={post._id}
                    className={style.formCard}
                    onClick={() => handleClickPost(post)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClickPost(post);
                      }
                    }}
                  >
                    <div className={style.formCardLeft}>
                      <div className={style.formCardTitle}>{post.title}</div>
                      <div className={style.formCardMeta}>
                        {post.isUnread && (
                          <span
                            className={`${style.formCardBadge} ${style.badgePending}`}
                          >
                            안 읽음
                          </span>
                        )}
                        {post.isPinned && (
                          <span
                            className={style.formCardBadge}
                            style={{
                              background: "var(--status-info-bg)",
                              color: "var(--status-info)",
                            }}
                          >
                            공지
                          </span>
                        )}
                        {post.isDraft && (
                          <span
                            className={`${style.formCardBadge} ${style.badgePending}`}
                          >
                            비공개
                          </span>
                        )}
                        {post.authorName && <span>{post.authorName}</span>}
                        <span>{formatDate(post.createdAt)}</span>
                        <span>읽기: {formatPermissionRead(post)}</span>
                      </div>
                    </div>
                    {editable && (
                      <div className={style.formCardRight}>
                        <button
                          type="button"
                          className={style.formCardIconBtn}
                          title="문서 수정"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/boards/${board._id}/edit/${post._id}`);
                          }}
                        >
                          <Svg type="write" width="20px" height="20px" />
                        </button>
                        <button
                          type="button"
                          className={style.formCardIconBtn}
                          title=".md 다운로드"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadMd(post);
                          }}
                        >
                          <Svg type="download" width="20px" height="20px" />
                        </button>
                        <button
                          type="button"
                          className={style.formCardIconBtn}
                          title="복제"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(post._id);
                          }}
                        >
                          <Svg type="copy" width="20px" height="20px" />
                        </button>
                        {post.isDraft ? (
                          <button
                            type="button"
                            className={`${style.formCardIconBtn} ${style.formCardIconBtnDanger}`}
                            title="삭제"
                            disabled={isDeleting}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletePost(post);
                            }}
                          >
                            <Svg type="trash" width="20px" height="20px" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={style.formCardIconBtn}
                            title="비공개로"
                            disabled={isDeleting}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await PostAPI.UPost({
                                  params: { _id: post._id },
                                  data: { isDraft: true },
                                });
                                await loadPosts();
                              } catch (err) {
                                ALERT_ERROR(err);
                              }
                            }}
                          >
                            <Svg type="archive" width="20px" height="20px" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      {deletePopup}
    </div>
  );
};

export default AltDocsView;
