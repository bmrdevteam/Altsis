/**
 * @file Board Detail Page - Posts list with table/gallery/blog views
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
import bStyle from "./boards.module.scss";

import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";

import { TBoard, TBoardContentViewMode } from "types/board";
import { TPost } from "types/post";

import BoardManagePopup from "./popup/BoardManage";
import UserListPopup from "./popup/UserListPopup";
import PostBlogView from "./views/PostBlogView";

type TPostWithSelection = TPost & { tableRowChecked?: boolean };

const formatPermissionRead = (post: TPost): string => {
  // 새 구조: permissionRead (개별 사용자 기반)
  if (post.permissionRead?.users && post.permissionRead.users.length > 0) {
    return `지정(${post.permissionRead.users.length}명)`;
  }

  // 레거시 폴백: targetAudience
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

const BoardPid = () => {
  const navigate = useAppNavigate();
  const { boardId } = useParams<{ boardId: string }>();
  const { currentUser } = useAuth();
  const { BoardAPI, PostAPI } = useAPIv2();

  const [board, setBoard] = useState<TBoard | null>(null);
  const [posts, setPosts] = useState<TPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<TPostWithSelection[]>([]);
  const [showManagePopup, setShowManagePopup] = useState(false);
  const [showMemberListPopup, setShowMemberListPopup] = useState(false);

  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const canManageBoard = (b: TBoard) => {
    if (isManager) return true;
    if (b.creator && b.creator === currentUser?._id) return true;
    return false;
  };

  // 보드 정보 로드
  useEffect(() => {
    if (!boardId) {
      navigate("/boards", { replace: true });
      return;
    }

    setIsLoading(true);
    BoardAPI.RBoard({ params: { _id: boardId } })
      .then(({ board }) => {
        setBoard(board);
        setIsLoading(false);
        setIsPostsLoading(true);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        navigate("/boards", { replace: true });
      });
  }, [boardId]);

  // 게시글 로드
  useEffect(() => {
    if (isPostsLoading && board) {
      const needsContent = (board.contentViewMode || "table") === "blog";
      PostAPI.RPosts({
        query: {
          board: board._id,
          ...(needsContent && { includeContent: "true" }),
        },
      })
        .then(({ posts }) => {
          setPosts(posts);
          setIsPostsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsPostsLoading(false);
        });
    }
  }, [isPostsLoading, board]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const canWrite = () => {
    if (!board) return false;
    if (currentUser?.auth === "admin") return true;
    if (currentUser?.auth === "manager") return true;
    if (board.creator && board.creator === currentUser?._id) return true;
    // 개별 작성자 확인
    if (
      board.writers?.users?.some(
        (u) => u.userId === currentUser?.userId
      )
    )
      return true;
    return false;
  };

  const handleTableChange = (data: TPostWithSelection[]) => {
    setSelectedPosts(data.filter((post) => post.tableRowChecked));
  };

  const canEditSelected = () => {
    if (selectedPosts.length === 0) return false;
    if (selectedPosts.some((post) => post.isLegacyNotification)) return false;
    if (isManager) return true;
    return selectedPosts.every((post) => post.author === currentUser?._id);
  };

  const canDeleteSelected = () => {
    if (selectedPosts.length === 0) return false;
    if (isManager) return true;
    return selectedPosts.every((post) => post.author === currentUser?._id);
  };

  const canPinSelected = () => {
    if (selectedPosts.some((post) => post.isLegacyNotification)) return false;
    return selectedPosts.length > 0 && isManager;
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
      setIsPostsLoading(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handlePinSelected = async (isPinned: boolean) => {
    try {
      await Promise.all(
        selectedPosts.map((post) =>
          PostAPI.UPostPin({
            params: { _id: post._id },
            data: { isPinned },
          })
        )
      );
      setSelectedPosts([]);
      setIsPostsLoading(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleEditSelected = () => {
    if (selectedPosts.length === 1 && board) {
      navigate(`/boards/${board._id}/edit/${selectedPosts[0]._id}`);
    }
  };

  const handleClickPost = (post: TPost) => {
    if (board) {
      navigate(`/boards/${board._id}/post/${post._id}`);
    }
  };

  const handleLeaveBoard = async () => {
    if (!board) return;
    if (!window.confirm("이 보드에서 나가시겠습니까?")) return;
    try {
      await BoardAPI.DBoardLeave({ params: { _id: board._id } });
      alert("보드에서 나갔습니다.");
      navigate("/boards");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 콘텐츠 뷰 모드 변경 (관리자/생성자만)
  const handleViewModeChange = async (mode: TBoardContentViewMode) => {
    if (!board || mode === board.contentViewMode) return;

    const prevMode = board.contentViewMode || "table";

    // 즉시 UI 반영
    setBoard({ ...board, contentViewMode: mode });

    try {
      await BoardAPI.UBoard({
        params: { _id: board._id },
        data: { contentViewMode: mode },
      });
      // 블로그 모드 전환 시 content가 필요하므로 게시글 다시 로드
      if (mode === "blog" && prevMode !== "blog") {
        setIsPostsLoading(true);
      }
    } catch (err) {
      // 실패 시 원래 모드로 복원
      setBoard((prev) =>
        prev ? { ...prev, contentViewMode: board.contentViewMode } : prev
      );
      ALERT_ERROR(err);
    }
  };

  const tableData = useMemo(
    () =>
      posts.map((post, index) => ({
        ...post,
        no: posts.length - index,
        createdAtDisplay: formatDate(post.createdAt),
        titleDisplay: [
          post.isPinned ? "[공지]" : "",
          post.title,
        ].filter(Boolean).join(" "),
        permissionDisplay: formatPermissionRead(post),
      })),
    [posts]
  );

  const renderPostView = () => {
    if (!board) return null;
    const viewMode = board.contentViewMode || "table";

    switch (viewMode) {
      case "blog":
        return <PostBlogView posts={posts} board={board} onClickPost={handleClickPost} />;
      case "table":
      default:
        return (
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
                onClick: (e: TPost) => {
                  navigate(`/boards/${board._id}/post/${e._id}`);
                },
              },
              {
                text: "대상",
                key: "permissionDisplay",
                type: "text",
                width: "100px",
                textAlign: "center",
              },
              {
                text: "작성자",
                key: "authorName",
                type: "text",
                width: "180px",
                render: (_value: string, row: TPost) => (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: "var(--background-color-2)",
                        backgroundImage: row.authorProfile
                          ? `url(${row.authorProfile})`
                          : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        color: "var(--text-color-2)",
                        flexShrink: 0,
                      }}
                    >
                      {!row.authorProfile && row.authorName?.charAt(0)}
                    </div>
                    <span>
                      {row.authorName}({row.authorId})
                    </span>
                  </div>
                ),
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
        );
    }
  };

  if (isLoading || !board) return null;

  return (
    <>
      <div className={`${style.section} ${bStyle.page}`}>
        {/* 보드 헤더 */}
        <div className={bStyle.detailHeader}>
          <div className={bStyle.detailHeaderLeft}>
            <button
              className={bStyle.iconBtn}
              onClick={() => navigate("/boards")}
              title="보드 목록"
            >
              <Svg type="chevronLeft" width="20px" height="20px" />
            </button>
            <div className={bStyle.detailTitleWrap}>
              <div
                className={style.title}
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {board.coverColor && (
                  <div
                    className={bStyle.boardColorDot}
                    style={{
                      backgroundColor: board.coverColor,
                      width: "12px",
                      height: "12px",
                    }}
                  />
                )}
                {board.name}
              </div>
              {board.description && (
                <p className={bStyle.detailDescription}>
                  {board.description}
                </p>
              )}
            </div>
          </div>

          <div className={bStyle.detailHeaderRight}>
            <button
              className={bStyle.textBtn}
              onClick={() => setShowMemberListPopup(true)}
              title="멤버 보기"
            >
              <Svg type="user" width="16px" height="16px" />
              멤버
            </button>
            {canManageBoard(board) && (
              <button
                className={bStyle.iconBtn}
                onClick={() => setShowManagePopup(true)}
                title="보드 관리"
              >
                <Svg type="settings" width="18px" height="18px" />
              </button>
            )}
            {!canManageBoard(board) && !board.isDefault && (
              <button
                className={bStyle.textBtn}
                onClick={handleLeaveBoard}
                title="보드 나가기"
              >
                <Svg type="logout" width="16px" height="16px" />
                나가기
              </button>
            )}
          </div>
        </div>

        {/* 툴바: 뷰 모드 전환 + 글쓰기/액션 버튼 */}
        <div className={bStyle.detailToolbar}>
          <div />

          {/* 글쓰기/액션 버튼 */}
          <div className={bStyle.actionBtns}>
            {canManageBoard(board) && selectedPosts.length === 0 && (
              <Button
                type="ghost"
                onClick={() =>
                  handleViewModeChange(
                    (board.contentViewMode || "table") === "table"
                      ? "blog"
                      : "table"
                  )
                }
              >
                <>
                  <Svg
                    type={
                      (board.contentViewMode || "table") === "table"
                        ? "article"
                        : "list"
                    }
                    width="16px"
                    height="16px"
                  />
                  보기
                </>
              </Button>
            )}
            {selectedPosts.length === 0 ? (
              canWrite() && (
                <Button
                  type="ghost"
                  onClick={() => navigate(`/boards/${board._id}/create`)}
                >
                  <>
                    <Svg type="edit" width="16px" height="16px" />
                    글쓰기
                  </>
                </Button>
              )
            ) : (
              <>
                {canEditSelected() && selectedPosts.length === 1 && (
                  <Button type="ghost" onClick={handleEditSelected}>
                    <>
                      <Svg type="edit" width="16px" height="16px" />
                      수정
                    </>
                  </Button>
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
                {canPinSelected() &&
                  selectedPosts.some((p) => !p.isPinned) && (
                    <Button
                      type="ghost"
                      onClick={() => handlePinSelected(true)}
                    >
                      <>
                        <Svg type="pin" width="16px" height="16px" />
                        고정
                      </>
                    </Button>
                  )}
                {canPinSelected() &&
                  selectedPosts.some((p) => p.isPinned) && (
                    <Button
                      type="ghost"
                      onClick={() => handlePinSelected(false)}
                    >
                      <>
                        <Svg type="pinOff" width="16px" height="16px" />
                        고정해제
                      </>
                    </Button>
                  )}
              </>
            )}
          </div>
        </div>

        {/* 게시글 목록 */}
        {renderPostView()}
      </div>

      {/* 팝업 */}
      {showManagePopup && (
        <BoardManagePopup
          board={board}
          setState={setShowManagePopup}
          onSuccess={() => {
            BoardAPI.RBoard({ params: { _id: board._id } })
              .then(({ board: updated }) => {
                setBoard(updated);
              })
              .catch(ALERT_ERROR);
          }}
        />
      )}

      {showMemberListPopup && (
        <UserListPopup
          title="보드 멤버"
          setState={setShowMemberListPopup}
          fetchUsers={() =>
            BoardAPI.RBoardMemberList({ params: { _id: board._id } })
          }
        />
      )}
    </>
  );
};

export default BoardPid;
