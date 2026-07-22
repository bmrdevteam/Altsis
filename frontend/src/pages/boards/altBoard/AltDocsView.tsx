import { useEffect, useState } from "react";
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

const AltDocsView = ({ board }: Props) => {
  const navigate = useAppNavigate();
  const { currentUser } = useAuth();
  const { PostAPI } = useAPIv2();

  const [posts, setPosts] = useState<TPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePost, setDeletePost] = useState<TPost | null>(null);

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
                  query: { merge: "true" },
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

  if (isLoading) return null;

  const writeToolbar = canWrite() ? (
    <div className={style.formListToolbar}>
      <button
        type="button"
        className={style.formCardIconBtn}
        title="글쓰기"
        onClick={() => navigate(`/boards/${board._id}/create`)}
      >
        <Svg type="plus" width="20px" height="20px" />
      </button>
    </div>
  ) : null;

  if (contentViewMode === "blog") {
    return (
      <div className={style.formList}>
        {writeToolbar}
        {posts.length === 0 ? (
          <div className={style.emptyState}>아직 작성된 문서가 없습니다.</div>
        ) : (
          <PostBlogView
            posts={posts}
            board={board}
            onClickPost={handleClickPost}
          />
        )}
      </div>
    );
  }

  return (
    <div className={style.formList}>
      {writeToolbar}

      {posts.length === 0 ? (
        <div className={style.emptyState}>아직 작성된 문서가 없습니다.</div>
      ) : (
        <div className={style.formCardList} style={{ paddingTop: 0 }}>
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
                      title="수정"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/boards/${board._id}/edit/${post._id}`);
                      }}
                    >
                      <Svg type="edit" width="20px" height="20px" />
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deletePost && (
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
            <strong>{deletePost.title || "문서"}</strong> 게시글을
            삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </div>
        </Popup>
      )}
    </div>
  );
};

export default AltDocsView;
