/**
 * @file Boards List Page - Board list with tab/gallery views, favorites
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
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import style from "style/pages/enrollment.module.scss";
import bStyle from "./boards.module.scss";


import Svg from "assets/svg/Svg";

import { TBoard, TBoardListViewMode } from "types/board";

import BoardCreatePopup from "./popup/BoardCreate";
import BoardManagePopup from "./popup/BoardManage";
import BoardGalleryView from "./views/BoardGalleryView";

const Boards = () => {
  const navigate = useAppNavigate();
  const { currentUser, currentSchool, currentRegistration } = useAuth();
  const { BoardAPI, BoardFavoriteAPI } = useAPIv2();

  const [boards, setBoards] = useState<TBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boardEnabled, setBoardEnabled] = useState<boolean | null>(null);

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [boardListViewMode, setBoardListViewMode] =
    useState<TBoardListViewMode>(
      () =>
        (localStorage.getItem("boardListViewMode") as TBoardListViewMode) ||
        "table"
    );
  const [showBoardCreatePopup, setShowBoardCreatePopup] = useState(false);
  const [showBoardManagePopup, setShowBoardManagePopup] = useState(false);
  const [managingBoard, setManagingBoard] = useState<TBoard | null>(null);

  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const canCreateBoard = useMemo(() => {
    if (isManager) return true;
    const permission = currentSchool?.boardCreationPermission;
    if (currentRegistration?.role === "teacher" && permission?.teacher)
      return true;
    if (currentRegistration?.role === "student" && permission?.student)
      return true;
    return false;
  }, [currentUser, currentSchool, currentRegistration]);

  const canManageBoard = (board: TBoard) => {
    if (isManager) return true;
    if (board.creator && board.creator === currentUser?._id) return true;
    return false;
  };

  // 게시판 목록 로드
  useEffect(() => {
    if (isLoading && currentSchool) {
      BoardAPI.RBoards({
        query: { school: currentSchool._id },
      })
        .then(({ boards }) => {
          setBoards(boards);
          setBoardEnabled(true);
          setIsLoading(false);
        })
        .catch((err: any) => {
          if (err?.response?.data?.message === "BOARD_NOT_ENABLED") {
            setBoardEnabled(false);
          } else {
            ALERT_ERROR(err);
          }
          setIsLoading(false);
        });
    }
  }, [isLoading, currentSchool]);

  // 보드 클릭 → 상세 페이지로 이동
  const handleBoardClick = (board: TBoard) => {
    navigate(`/boards/${board._id}`);
  };

  // 보드 목록 뷰 모드 변경
  const handleListViewModeChange = (mode: TBoardListViewMode) => {
    setBoardListViewMode(mode);
    localStorage.setItem("boardListViewMode", mode);
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = async (board: TBoard) => {
    if (!currentSchool) return;

    try {
      if (board.isFavorited) {
        await BoardFavoriteAPI.DBoardFavoriteByBoard({
          params: { boardId: board._id },
        });
      } else {
        await BoardFavoriteAPI.CBoardFavorite({
          data: { board: board._id, school: currentSchool._id },
        });
      }

      setBoards((prev) =>
        prev.map((b) =>
          b._id === board._id ? { ...b, isFavorited: !b.isFavorited } : b
        )
      );
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  // 보드 관리 팝업 열기
  const handleManageBoard = (board: TBoard) => {
    setManagingBoard(board);
    setShowBoardManagePopup(true);
  };

  // 즐겨찾기 필터 적용된 보드 목록
  const displayBoards = useMemo(
    () =>
      showFavoritesOnly
        ? boards.filter((b) => b.isFavorited)
        : boards,
    [boards, showFavoritesOnly]
  );

  if (boardEnabled === false) {
    return (
      <div className={`${style.section} ${bStyle.page}`}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
            color: "var(--accent-3)",
          }}
        >
          보드가 활성화되지 않았습니다.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${style.section} ${bStyle.page}`}>
        {/* 상단 헤더: 제목 + 툴바 */}
        <div className={bStyle.header}>
          <div className={style.title} style={{ margin: 0 }}>
            보드
          </div>

          {/* 툴바 */}
          <div className={bStyle.toolbar}>
            {canCreateBoard && (
              <button
                className={bStyle.iconBtn}
                onClick={() => setShowBoardCreatePopup(true)}
                title="보드 생성"
              >
                <Svg type="plus" width="18px" height="18px" />
              </button>
            )}

            <button
              className={`${bStyle.iconBtn} ${
                showFavoritesOnly ? bStyle.iconBtnActive : ""
              }`}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              title="즐겨찾기만 보기"
            >
              <span className={bStyle.starIcon}>
                {showFavoritesOnly ? "★" : "☆"}
              </span>
            </button>

            <button
              className={bStyle.iconBtn}
              onClick={() =>
                handleListViewModeChange(
                  boardListViewMode === "table" ? "gallery" : "table"
                )
              }
              title={boardListViewMode === "table" ? "갤러리 보기" : "탭 보기"}
            >
              <Svg
                type={boardListViewMode === "table" ? "list" : "dashboard"}
                width="18px"
                height="18px"
              />
            </button>
          </div>
        </div>

        {/* 보드 목록 */}
        {boardListViewMode === "table" ? (
          <>
            {displayBoards.length > 0 && (
              <div className={bStyle.boardList}>
                {displayBoards.map((board) => (
                  <div
                    key={board._id}
                    className={bStyle.boardItem}
                    onClick={() => handleBoardClick(board)}
                  >
                    {board.coverColor && (
                      <div
                        className={bStyle.boardItemColorBar}
                        style={{ backgroundColor: board.coverColor }}
                      />
                    )}
                    <div className={bStyle.boardItemLeft}>
                      <div className={bStyle.boardItemInfo}>
                        <div className={bStyle.boardNameRow}>
                          <span className={bStyle.boardName}>
                            {board.isDefault && "📢 "}
                            {board.name}
                          </span>
                          {board.boardType === "user" && (
                            <span
                              className={`${bStyle.badge} ${bStyle.badgeUser}`}
                            >
                              사용자
                            </span>
                          )}
                          <button
                            className={`${bStyle.favoriteBtn} ${
                              board.isFavorited ? bStyle.favoriteBtnActive : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(board);
                            }}
                            title={board.isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                          >
                            {board.isFavorited ? "★" : "☆"}
                          </button>
                        </div>
                        {board.description && (
                          <span className={bStyle.boardDescription}>
                            {board.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={bStyle.boardItemRight}>
                      <span>게시글 {board.postCount}개</span>
                      {canManageBoard(board) && (
                        <button
                          className={bStyle.iconBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageBoard(board);
                          }}
                          title="보드 관리"
                        >
                          <Svg type="settings" width="16px" height="16px" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <BoardGalleryView
            boards={displayBoards}
            selectedBoard={null}
            onSelect={handleBoardClick}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {boards.length === 0 && !isLoading && (
          <div className={bStyle.empty}>보드가 없습니다.</div>
        )}
      </div>

      {/* 팝업 */}
      {showBoardCreatePopup && (
        <BoardCreatePopup
          setState={setShowBoardCreatePopup}
          onSuccess={() => setIsLoading(true)}
        />
      )}
      {showBoardManagePopup && managingBoard && (
        <BoardManagePopup
          board={managingBoard}
          setState={setShowBoardManagePopup}
          onSuccess={() => setIsLoading(true)}
        />
      )}
    </>
  );
};

export default Boards;
