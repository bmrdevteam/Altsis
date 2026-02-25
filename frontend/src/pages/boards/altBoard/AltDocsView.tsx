import { useEffect, useMemo, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import bStyle from "../boards.module.scss";

import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";
import PostBlogView from "../views/PostBlogView";
import BatchPrintView from "./BatchPrintView";

import { TBoard, TBoardContentViewMode } from "types/board";
import { TPost } from "types/post";

type TPostWithSelection = TPost & { tableRowChecked?: boolean };

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

const AltDocsView = ({ board }: Props) => {
  const navigate = useAppNavigate();
  const { currentUser } = useAuth();
  const { PostAPI } = useAPIv2();

  const [posts, setPosts] = useState<TPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState<TPostWithSelection[]>([]);
  const [contentViewMode, setContentViewMode] =
    useState<TBoardContentViewMode>(board.contentViewMode || "table");
  const [batchPrintPostId, setBatchPrintPostId] = useState<string | null>(
    null
  );

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
    const role = board.altBoardRole?.[currentUser?.userId || ""];
    if (role === "admin" || role === "writer") return true;
    return false;
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

  const handleTableChange = (data: TPostWithSelection[]) => {
    setSelectedPosts(data.filter((post) => post.tableRowChecked));
  };

  const canDeleteSelected = () => {
    if (selectedPosts.length === 0) return false;
    if (isManager) return true;
    return selectedPosts.every((post) => post.author === currentUser?._id);
  };

  const canEditSelected = () => {
    if (selectedPosts.length === 0) return false;
    if (isManager) return true;
    return selectedPosts.every((post) => post.author === currentUser?._id);
  };

  const handleDeleteSelected = async () => {
    if (
      !window.confirm(
        `선택한 ${selectedPosts.length}개의 게시글을 삭제하시겠습니까?`
      )
    )
      return;
    try {
      await Promise.all(
        selectedPosts.map((post) =>
          PostAPI.DPost({ params: { _id: post._id } })
        )
      );
      setSelectedPosts([]);
      loadPosts();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

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

  const handleClickPost = (post: TPost) => {
    navigate(`/boards/${board._id}/post/${post._id}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const tableData = useMemo(
    () =>
      posts.map((post, index) => ({
        ...post,
        no: posts.length - index,
        createdAtDisplay: formatDate(post.createdAt),
        titleDisplay: [post.isPinned ? "[공지]" : "", post.title]
          .filter(Boolean)
          .join(" "),
        permissionDisplay: formatPermissionRead(post),
      })),
    [posts]
  );

  if (isLoading) return null;

  // 일괄 인쇄 모드
  if (batchPrintPostId) {
    return (
      <BatchPrintView
        postId={batchPrintPostId}
        onClose={() => setBatchPrintPostId(null)}
      />
    );
  }

  return (
    <div>
      {/* 툴바 */}
      <div className={bStyle.detailToolbar}>
        <div />
        <div className={bStyle.actionBtns}>
          {selectedPosts.length === 0 ? (
            <>
              {canWrite() && (
                <Button
                  type="ghost"
                  onClick={() => navigate(`/boards/${board._id}/create`)}
                >
                  <>
                    <Svg type="edit" width="16px" height="16px" />
                    글쓰기
                  </>
                </Button>
              )}
            </>
          ) : (
            <>
              {canEditSelected() && selectedPosts.length === 1 && (
                <>
                  <Button
                    type="ghost"
                    onClick={() =>
                      navigate(
                        `/boards/${board._id}/edit/${selectedPosts[0]._id}`
                      )
                    }
                  >
                    <>
                      <Svg type="edit" width="16px" height="16px" />
                      수정
                    </>
                  </Button>
                  <Button
                    type="ghost"
                    onClick={() => handleDuplicate(selectedPosts[0]._id)}
                  >
                    복제
                  </Button>
                  <Button
                    type="ghost"
                    onClick={() => handleDownloadMd(selectedPosts[0])}
                  >
                    .md 다운로드
                  </Button>
                  <Button
                    type="ghost"
                    onClick={() =>
                      setBatchPrintPostId(selectedPosts[0]._id)
                    }
                  >
                    일괄 인쇄
                  </Button>
                </>
              )}
              {canDeleteSelected() && (
                <Button
                  type="ghost"
                  onClick={handleDeleteSelected}
                  style={{ color: "var(--red-1)" }}
                >
                  <>
                    <Svg type="trash" width="16px" height="16px" />
                    삭제
                  </>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 게시글 목록 */}
      {posts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-color-2)",
            fontSize: "14px",
          }}
        >
          아직 작성된 문서가 없습니다.
        </div>
      ) : contentViewMode === "blog" ? (
        <PostBlogView
          posts={posts}
          board={board}
          onClickPost={handleClickPost}
        />
      ) : (
        <Table
          type="object-array"
          control
          data={tableData}
          defaultPageBy={10}
          onChange={handleTableChange}
          header={[
            {
              text: "",
              type: "checkbox",
              width: "0",
              textAlign: "center",
            },
            {
              text: "No",
              key: "no",
              type: "text",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "제목",
              key: "titleDisplay",
              type: "text",
              cursor: "pointer",
              onClick: (e: TPost) => handleClickPost(e),
            },
            {
              text: "작성자",
              key: "authorName",
              type: "text",
              width: "120px",
              textAlign: "center",
            },
            {
              text: "작성일",
              key: "createdAtDisplay",
              type: "text",
              width: "120px",
              textAlign: "center",
            },
          ]}
        />
      )}
    </div>
  );
};

export default AltDocsView;
