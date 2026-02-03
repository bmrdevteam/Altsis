/**
 * @file Boards Page with Tab-based UI
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import style from "style/pages/enrollment.module.scss";

import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import Svg from "assets/svg/Svg";

import { TBoard } from "types/board";
import { TPost, TPostTargetAudience } from "types/post";

type TPostWithSelection = TPost & { tableRowChecked?: boolean };

const formatTargetAudience = (targetAudience?: TPostTargetAudience): string => {
  if (!targetAudience || targetAudience.type === "all") {
    return "전체";
  }
  switch (targetAudience.type) {
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
};

const Boards = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, currentSchool } = useAuth();
  const { BoardAPI, PostAPI } = useAPIv2();

  const [boards, setBoards] = useState<TBoard[]>([]);
  const [posts, setPosts] = useState<TPost[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<TBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<TPostWithSelection[]>([]);

  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  // 게시판 목록 로드
  useEffect(() => {
    if (isLoading && currentSchool) {
      BoardAPI.RBoards({
        query: { school: currentSchool._id },
      })
        .then(({ boards }) => {
          setBoards(boards);

          // URL에서 boardId 파라미터 확인, 없으면 기본 게시판(공지사항) 선택
          const boardIdFromUrl = searchParams.get("boardId");
          let initialBoard: TBoard | null = null;

          if (boardIdFromUrl) {
            initialBoard =
              boards.find((b: TBoard) => b._id === boardIdFromUrl) || null;
          }

          if (!initialBoard && boards.length > 0) {
            // isDefault가 true인 게시판(공지사항)을 우선 선택
            initialBoard =
              boards.find((b: TBoard) => b.isDefault) || boards[0];
          }

          if (initialBoard) {
            setSelectedBoard(initialBoard);
            setIsPostsLoading(true);
          }

          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsLoading(false);
        });
    }
  }, [isLoading, currentSchool]);

  // 선택된 게시판의 게시글 로드
  useEffect(() => {
    if (isPostsLoading && selectedBoard) {
      PostAPI.RPosts({ query: { board: selectedBoard._id } })
        .then(({ posts }) => {
          setPosts(posts);
          setIsPostsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsPostsLoading(false);
        });
    }
  }, [isPostsLoading, selectedBoard]);

  // 게시판 탭 변경
  const handleBoardChange = (board: TBoard) => {
    setSelectedBoard(board);
    setSearchParams({ boardId: board._id });
    setSelectedPosts([]);
    setIsPostsLoading(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 쓰기 권한 확인
  const canWrite = () => {
    if (!selectedBoard) return false;
    if (isManager) return true;

    const role = currentUser?.auth;
    const permission = selectedBoard.permissionWrite;

    if (role === "member") {
      // member는 교사 또는 학생이므로 둘 중 하나의 권한이 있으면 허용
      if (permission?.teacher || permission?.student) return true;
    }

    return false;
  };

  // 테이블 변경 시 선택된 게시글 업데이트
  const handleTableChange = (data: TPostWithSelection[]) => {
    const checked = data.filter((post) => post.tableRowChecked);
    setSelectedPosts(checked);
  };

  // 선택된 게시글에 대한 권한 확인
  const canEditSelected = () => {
    if (selectedPosts.length === 0) return false;
    // 레거시 알림은 수정 불가
    if (selectedPosts.some((post) => post.isLegacyNotification)) return false;
    if (isManager) return true;
    // 비관리자는 자신이 작성한 글만 수정 가능
    return selectedPosts.every(
      (post) => post.author === currentUser?._id
    );
  };

  const canDeleteSelected = () => {
    if (selectedPosts.length === 0) return false;
    if (isManager) return true;
    // 비관리자는 자신이 작성한 글만 삭제 가능
    return selectedPosts.every(
      (post) => post.author === currentUser?._id
    );
  };

  const canPinSelected = () => {
    // 고정은 관리자만 가능, 레거시 알림은 고정 불가
    if (selectedPosts.some((post) => post.isLegacyNotification)) return false;
    return selectedPosts.length > 0 && isManager;
  };

  // 선택된 게시글 삭제
  const handleDeleteSelected = async () => {
    if (!window.confirm(`선택한 ${selectedPosts.length}개의 게시글을 삭제하시겠습니까?`)) {
      return;
    }

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

  // 선택된 게시글 고정/고정해제
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

  // 선택된 게시글 수정 (1개만 선택된 경우)
  const handleEditSelected = () => {
    if (selectedPosts.length === 1 && selectedBoard) {
      navigate(`/boards/${selectedBoard._id}/edit/${selectedPosts[0]._id}`);
    }
  };

  // 테이블 데이터 메모이제이션 (체크박스 상태 유지를 위해)
  const tableData = useMemo(
    () =>
      posts.map((post, index) => ({
        ...post,
        no: posts.length - index,
        createdAtDisplay: formatDate(post.createdAt),
        titleDisplay: post.isPinned ? `[공지] ${post.title}` : post.title,
        targetAudienceDisplay: formatTargetAudience(post.targetAudience),
      })),
    [posts]
  );

  return (
    <>
      <div className={style.section}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div className={style.title} style={{ margin: 0 }}>
            알림
          </div>
        </div>

        {/* 게시판 탭 */}
        {boards.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: "16px",
              overflowX: "auto",
            }}
          >
            {boards.map((board) => (
              <button
                key={board._id}
                onClick={() => handleBoardChange(board)}
                style={{
                  padding: "12px 20px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: selectedBoard?._id === board._id ? 600 : 400,
                  color:
                    selectedBoard?._id === board._id
                      ? "var(--accent-1)"
                      : "var(--text-color-2)",
                  borderBottom:
                    selectedBoard?._id === board._id
                      ? "2px solid var(--accent-1)"
                      : "2px solid transparent",
                  marginBottom: "-1px",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {board.isDefault && "📢 "}
                {board.name}
              </button>
            ))}
          </div>
        )}

        {/* 선택된 게시판 설명 */}
        {selectedBoard?.description && (
          <p
            style={{
              color: "var(--text-color-2)",
              marginBottom: "16px",
              marginTop: "16px",
            }}
          >
            {selectedBoard.description}
          </p>
        )}

        {/* 글쓰기 버튼 및 선택 시 액션 버튼 */}
        {selectedBoard && (
          <div style={{ marginBottom: "16px", marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {selectedPosts.length === 0 ? (
              // 선택된 게시글이 없을 때: 글쓰기 버튼만 표시
              canWrite() && (
                <Button
                  type="ghost"
                  onClick={() => navigate(`/boards/${selectedBoard._id}/create`)}
                >
                  <>
                    <Svg type="edit" width="16px" height="16px" />
                    글쓰기
                  </>
                </Button>
              )
            ) : (
              // 선택된 게시글이 있을 때: 액션 버튼 표시
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
                {canPinSelected() && selectedPosts.some((p) => !p.isPinned) && (
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
                {canPinSelected() && selectedPosts.some((p) => p.isPinned) && (
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
        )}

        {/* 게시글 목록 */}
        {selectedBoard && (
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
                  navigate(`/boards/${selectedBoard._id}/post/${e._id}`);
                },
              },
              {
                text: "대상",
                key: "targetAudienceDisplay",
                type: "text",
                width: "80px",
                textAlign: "center",
              },
              {
                text: "작성자",
                key: "authorName",
                type: "text",
                width: "180px",
                render: (_value: string, row: TPost) => (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                    <span>{row.authorName}({row.authorId})</span>
                  </div>
                ),
              },
              {
                text: "조회",
                key: "viewCount",
                type: "text",
                width: "80px",
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

        {boards.length === 0 && !isLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-color-2)",
            }}
          >
            알림이 없습니다.
          </div>
        )}
      </div>
    </>
  );
};

export default Boards;
