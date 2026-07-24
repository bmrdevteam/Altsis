/**
 * @file Boards List Page - Activity todos + board list tabs
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import style from "style/pages/enrollment.module.scss";
import bStyle from "./boards.module.scss";
import aStyle from "./altBoard/altBoard.module.scss";

import Svg from "assets/svg/Svg";
import Tab from "components/tab/Tab";

import { TBoard, TBoardListViewMode } from "types/board";

import BoardCreatePopup from "./popup/BoardCreate";
import BoardManagePopup from "./popup/BoardManage";
import BoardGalleryView from "./views/BoardGalleryView";
import BoardsActivityTodos, {
  TSchoolTodoItem,
} from "./BoardsActivityTodos";

const Boards = () => {
  const navigate = useAppNavigate();
  const location = useLocation();
  const { currentUser, currentSchool, currentRegistration } = useAuth();
  const { BoardAPI, BoardFavoriteAPI, AltSheetRowAPI } = useAPIv2();

  const [boards, setBoards] = useState<TBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boardEnabled, setBoardEnabled] = useState<boolean | null>(null);

  const [todos, setTodos] = useState<TSchoolTodoItem[]>([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todosReady, setTodosReady] = useState(false);

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
  }, [currentUser, currentSchool, currentRegistration, isManager]);

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

  // 전역 할 일 로드
  useEffect(() => {
    if (!currentSchool) return;
    setTodosReady(false);
    setTodosLoading(true);
    AltSheetRowAPI.RAltSheetRowSchoolTodos({
      query: { school: currentSchool._id },
    })
      .then(({ items }) => {
        setTodos(items);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setTodos([]);
      })
      .finally(() => {
        setTodosLoading(false);
        setTodosReady(true);
      });
  }, [currentSchool?._id]);

  const handleBoardClick = (board: TBoard) => {
    navigate(`/boards/${board._id}`);
  };

  const handleListViewModeChange = (mode: TBoardListViewMode) => {
    setBoardListViewMode(mode);
    localStorage.setItem("boardListViewMode", mode);
  };

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

  const handleManageBoard = (board: TBoard) => {
    setManagingBoard(board);
    setShowBoardManagePopup(true);
  };

  const handleOpenTodo = (item: TSchoolTodoItem) => {
    if (item.kind === "approve" || item.kind === "outgoing") {
      const rowId = item.rowId ? encodeURIComponent(String(item.rowId)) : "";
      navigate(
        `/boards/${item.boardId}${
          rowId ? `?approval=${rowId}` : ""
        }#활동`
      );
      return;
    }
    // unsubmitted → 해당 양식 응답 화면
    navigate(`/boards/${item.boardId}?form=${item.formId}&mode=respond#활동`);
  };

  const handleGoToBoardsTab = () => {
    navigate(`${location.pathname}${location.search}#보드`, { replace: true });
  };

  // 구 해시 #활동 → #할 일 (목록 페이지 전용)
  useEffect(() => {
    const hash = decodeURI(location.hash || "").replace("#", "");
    if (hash === "활동") {
      navigate(`${location.pathname}${location.search}#할 일`, {
        replace: true,
      });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  const displayBoards = useMemo(
    () =>
      showFavoritesOnly ? boards.filter((b) => b.isFavorited) : boards,
    [boards, showFavoritesOnly]
  );

  const defaultTab = todos.length > 0 ? "할 일" : "보드";
  const tabBadges: Record<string, number> = {};
  if (todos.length > 0) tabBadges["할 일"] = todos.length;

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

  const boardListContent = (
    <div style={{ paddingTop: 20 }}>
      <section className={aStyle.formSectionPanel}>
        <div className={aStyle.formSectionHeaderStatic}>
          <div className={aStyle.formSectionHeaderMain}>
            <h3 className={aStyle.formSectionTitle}>보드</h3>
            <span className={aStyle.formSectionCount}>
              {displayBoards.length}
            </span>
          </div>
          <div className={aStyle.formListToolbar}>
            {canCreateBoard && (
              <button
                type="button"
                className={bStyle.iconBtn}
                onClick={() => setShowBoardCreatePopup(true)}
                title="보드 생성"
              >
                <Svg type="plus" width="18px" height="18px" />
              </button>
            )}
            <button
              type="button"
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
              type="button"
              className={bStyle.iconBtn}
              onClick={() =>
                handleListViewModeChange(
                  boardListViewMode === "table" ? "gallery" : "table"
                )
              }
              title={
                boardListViewMode === "table" ? "갤러리 보기" : "탭 보기"
              }
            >
              <Svg
                type={boardListViewMode === "table" ? "list" : "dashboard"}
                width="18px"
                height="18px"
              />
            </button>
          </div>
        </div>

        <div className={aStyle.formSectionBody}>
          {boardListViewMode === "table" ? (
            displayBoards.length > 0 ? (
              <div className={aStyle.formCardList}>
                {displayBoards.map((board) => (
                  <div
                    key={board._id}
                    className={`${aStyle.formCard} ${bStyle.boardFormCard}`}
                    onClick={() => handleBoardClick(board)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleBoardClick(board);
                      }
                    }}
                  >
                    <div
                      className={bStyle.boardItemColorBar}
                      style={{
                        backgroundColor:
                          board.coverColor || "var(--border-color)",
                      }}
                    />
                    <div className={aStyle.formCardLeft}>
                      <div className={aStyle.formCardTitle}>
                        {board.isDefault && "📢 "}
                        {board.name}
                      </div>
                      <div className={aStyle.formCardMeta}>
                        {board.boardType === "user" && (
                          <span
                            className={`${aStyle.formCardBadge} ${aStyle.badgeOptional}`}
                          >
                            사용자
                          </span>
                        )}
                        {board.description && (
                          <span className={bStyle.boardMetaDesc}>
                            {board.description}
                          </span>
                        )}
                        <span>게시글 {board.postCount ?? 0}개</span>
                      </div>
                    </div>
                    <div className={aStyle.formCardRight}>
                      <button
                        type="button"
                        className={`${aStyle.formCardIconBtn} ${
                          board.isFavorited ? bStyle.favoriteIconActive : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(board);
                        }}
                        title={
                          board.isFavorited
                            ? "즐겨찾기 해제"
                            : "즐겨찾기 추가"
                        }
                      >
                        <span className={bStyle.starIcon}>
                          {board.isFavorited ? "★" : "☆"}
                        </span>
                      </button>
                      {canManageBoard(board) && (
                        <button
                          type="button"
                          className={aStyle.formCardIconBtn}
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
            ) : (
              <div className={aStyle.emptyState}>
                {showFavoritesOnly
                  ? "즐겨찾기한 보드가 없습니다."
                  : "보드가 없습니다."}
              </div>
            )
          ) : displayBoards.length > 0 ? (
            <BoardGalleryView
              boards={displayBoards}
              selectedBoard={null}
              onSelect={handleBoardClick}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <div className={aStyle.emptyState}>
              {showFavoritesOnly
                ? "즐겨찾기한 보드가 없습니다."
                : "보드가 없습니다."}
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return (
    <>
      <div className={`${style.section} ${bStyle.page}`}>
        <div className={bStyle.header}>
          <div className={style.title} style={{ margin: 0 }}>
            보드
          </div>
        </div>

        {/* 할 일 로드 후 기본 탭 결정 (해시 있으면 해시 우선) */}
        {todosReady ? (
          <Tab
            items={{
              "할 일": (
                <BoardsActivityTodos
                  items={todos}
                  loading={todosLoading}
                  onOpenTodo={handleOpenTodo}
                  onGoToBoards={handleGoToBoardsTab}
                />
              ),
              보드: boardListContent,
            }}
            align="flex-start"
            defaultTab={defaultTab}
            badges={tabBadges}
          />
        ) : (
          <div className={bStyle.empty} style={{ paddingTop: 40 }}>
            불러오는 중…
          </div>
        )}
      </div>

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
