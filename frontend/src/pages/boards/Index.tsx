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

import { TBoard, TBoardLinkFilter, TBoardListViewMode } from "types/board";
import { resolveBoardCoverColor } from "utils/boardCoverColor";
import { getBoardScopeLabel, isSchoolOnlyBoard, isSeasonLinkedBoard } from "utils/boardLabels";

import BoardCreatePopup from "./popup/BoardCreate";
import BoardManagePopup from "./popup/BoardManage";
import BoardDuplicateFlow from "./popup/BoardDuplicateFlow";
import BoardGalleryView from "./views/BoardGalleryView";
import BoardListFilterBar, {
  TBoardListSort,
  TBoardScopeFilter,
  TBoardTypeFilter,
} from "./BoardListFilterBar";
import { sortBoardsForList } from "./boardListSort";
import BoardsActivityTodos, {
  TSchoolTodoItem,
} from "./BoardsActivityTodos";
import {
  getSchoolTodosCached,
  schoolTodosCacheKey,
} from "./schoolTodosCache";

const BOARD_LIST_SORT_KEY = "boardListSort";
const VALID_BOARD_LIST_SORTS: TBoardListSort[] = [
  "default",
  "name",
  "updatedAt",
  "createdAt",
  "postCount",
  "creatorName",
];

const readStoredBoardListSort = (): TBoardListSort => {
  try {
    const stored = localStorage.getItem(BOARD_LIST_SORT_KEY) as TBoardListSort;
    return VALID_BOARD_LIST_SORTS.includes(stored) ? stored : "default";
  } catch {
    return "default";
  }
};

const Boards = () => {
  const navigate = useAppNavigate();
  const location = useLocation();
  const { currentUser, currentSchool, currentRegistration, currentSeason } =
    useAuth();
  const { BoardAPI, BoardFavoriteAPI, AltSheetRowAPI } = useAPIv2();

  const [boards, setBoards] = useState<TBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boardEnabled, setBoardEnabled] = useState<boolean | null>(null);

  const [todos, setTodos] = useState<TSchoolTodoItem[]>([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [todosReady, setTodosReady] = useState(false);

  const [boardKeyword, setBoardKeyword] = useState("");
  const [boardListSort, setBoardListSort] = useState<TBoardListSort>(
    readStoredBoardListSort
  );
  const [hasTodosOnly, setHasTodosOnly] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<TBoardScopeFilter>("");
  const [boardTypeFilter, setBoardTypeFilter] =
    useState<TBoardTypeFilter>("");
  const [linkFilter, setLinkFilter] = useState<TBoardLinkFilter>("");
  const [boardListViewMode, setBoardListViewMode] =
    useState<TBoardListViewMode>(
      () =>
        (localStorage.getItem("boardListViewMode") as TBoardListViewMode) ||
        "table"
    );
  const [showBoardCreatePopup, setShowBoardCreatePopup] = useState(false);
  const [showBoardManagePopup, setShowBoardManagePopup] = useState(false);
  const [managingBoard, setManagingBoard] = useState<TBoard | null>(null);
  const [duplicatingBoard, setDuplicatingBoard] = useState<TBoard | null>(null);

  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const currentSeasonId =
    currentRegistration?.season || currentSeason?._id || undefined;

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
    if (
      board.creator &&
      String(board.creator) === String(currentUser?._id)
    ) {
      return true;
    }
    const uid = currentUser?._id ? String(currentUser._id) : "";
    if (uid && board.altBoardRole?.[uid] === "admin") return true;
    return false;
  };

  // 학교·시즌 변경 시 목록 다시 로드
  useEffect(() => {
    if (currentSchool) setIsLoading(true);
  }, [currentSchool?._id, currentSeasonId]);

  // 게시판 목록 로드
  useEffect(() => {
    if (isLoading && currentSchool) {
      BoardAPI.RBoards({
        query: {
          school: currentSchool._id,
          ...(currentSeasonId ? { season: currentSeasonId } : {}),
        },
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
  }, [isLoading, currentSchool, currentSeasonId]);

  // 전역 할 일 로드 (사이드바와 캐시 공유)
  useEffect(() => {
    if (!currentSchool) return;
    setTodosReady(false);
    setTodosLoading(true);
    const key = schoolTodosCacheKey(currentSchool._id, currentSeasonId);
    getSchoolTodosCached(key, () =>
      AltSheetRowAPI.RAltSheetRowSchoolTodos({
        query: {
          school: currentSchool._id,
          ...(currentSeasonId ? { season: currentSeasonId } : {}),
        },
      })
    )
      .then(({ items }) => {
        setTodos(items as TSchoolTodoItem[]);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setTodos([]);
      })
      .finally(() => {
        setTodosLoading(false);
        setTodosReady(true);
      });
  }, [currentSchool?._id, currentSeasonId]);

  const handleBoardClick = (board: TBoard) => {
    const coursePath = board.syllabusMeta?.coursePath;
    if (coursePath) {
      navigate(`${coursePath}#활동`);
      return;
    }
    navigate(`/boards/${board._id}`);
  };

  const handleListViewModeChange = (mode: TBoardListViewMode) => {
    setBoardListViewMode(mode);
    localStorage.setItem("boardListViewMode", mode);
  };

  const handleBoardListSortChange = (value: TBoardListSort) => {
    setBoardListSort(value);
    localStorage.setItem(BOARD_LIST_SORT_KEY, value);
  };

  const handleTogglePin = async (board: TBoard) => {
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

  const handleDuplicateBoard = (board: TBoard) => {
    setDuplicatingBoard(board);
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
    if (item.kind === "grade") {
      navigate(`/boards/${item.boardId}?sheet=${item.formId}#활동`);
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

  const todoCountByBoard = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of todos) {
      if (!item.boardId) continue;
      counts[item.boardId] = (counts[item.boardId] || 0) + 1;
    }
    return counts;
  }, [todos]);

  /** 칩 카운트용: 키워드만 반영 (칩 필터 전) */
  const boardsForChipCounts = useMemo(() => {
    const kw = boardKeyword.trim().toLowerCase();
    if (!kw) return boards;
    return boards.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(kw) ||
        (b.description || "").toLowerCase().includes(kw) ||
        (b.creatorName || "").toLowerCase().includes(kw)
    );
  }, [boards, boardKeyword]);

  const boardFilterCounts = useMemo(() => {
    let todos = 0;
    let school = 0;
    let season = 0;
    let official = 0;
    let user = 0;
    let syllabus = 0;
    let general = 0;
    for (const b of boardsForChipCounts) {
      if ((todoCountByBoard[b._id] || 0) > 0) todos += 1;
      if (isSchoolOnlyBoard(b)) school += 1;
      if (isSeasonLinkedBoard(b)) season += 1;
      if (b.boardType === "official") official += 1;
      if (b.boardType === "user") user += 1;
      if (b.syllabus || b.syllabusMeta) syllabus += 1;
      else general += 1;
    }
    return { todos, school, season, official, user, syllabus, general };
  }, [boardsForChipCounts, todoCountByBoard]);

  const hasBoardListFilters =
    !!boardKeyword.trim() ||
    hasTodosOnly ||
    !!scopeFilter ||
    !!boardTypeFilter ||
    !!linkFilter;

  const displayBoards = useMemo(() => {
    let result = boardsForChipCounts;
    if (hasTodosOnly) {
      result = result.filter((b) => (todoCountByBoard[b._id] || 0) > 0);
    }
    if (scopeFilter === "season") {
      result = result.filter((b) => isSeasonLinkedBoard(b));
    } else if (scopeFilter === "school") {
      result = result.filter((b) => isSchoolOnlyBoard(b));
    }
    if (boardTypeFilter) {
      result = result.filter((b) => b.boardType === boardTypeFilter);
    }
    if (linkFilter === "syllabus") {
      result = result.filter((b) => !!(b.syllabus || b.syllabusMeta));
    } else if (linkFilter === "general") {
      result = result.filter((b) => !(b.syllabus || b.syllabusMeta));
    }
    return sortBoardsForList(result, boardListSort);
  }, [
    boardsForChipCounts,
    hasTodosOnly,
    scopeFilter,
    boardTypeFilter,
    linkFilter,
    todoCountByBoard,
    boardListSort,
  ]);

  const pinnedBoards = useMemo(
    () => displayBoards.filter((b) => b.isFavorited),
    [displayBoards]
  );
  const unpinnedBoards = useMemo(
    () => displayBoards.filter((b) => !b.isFavorited),
    [displayBoards]
  );

  const clearBoardListFilters = () => {
    setBoardKeyword("");
    setHasTodosOnly(false);
    setScopeFilter("");
    setBoardTypeFilter("");
    setLinkFilter("");
  };

  const emptyBoardMessage = hasBoardListFilters
    ? "조건에 맞는 보드가 없습니다."
    : "보드가 없습니다.";

  const boardTabKey = "보드";
  const todoTabKey = "할 일";
  const tabBadges: Record<string, number> = {};
  if (todos.length > 0) tabBadges[todoTabKey] = todos.length;

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

  const renderBoardListCard = (board: TBoard, pinned: boolean) => {
    const todoCount = todoCountByBoard[board._id] || 0;
    return (
      <div
        key={board._id}
        className={`${aStyle.formCard} ${bStyle.boardFormCard} ${
          pinned ? bStyle.boardFormCardPinned : ""
        }`}
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
        <div className={bStyle.boardFormCardMain}>
          <div
            className={bStyle.boardItemColorBar}
            style={{
              backgroundColor: resolveBoardCoverColor(
                board.coverColor,
                board._id || board.name
              ),
            }}
          />
          <div className={aStyle.formCardLeft}>
            <div
              className={`${aStyle.formCardTitle} ${bStyle.boardTitleRow}`}
            >
              {board.isDefault && "📢 "}
              {board.name}
              {todoCount > 0 && (
                <span
                  className={bStyle.todoBadge}
                  title={`할 일 ${todoCount}건`}
                  aria-label={`할 일 ${todoCount}건`}
                >
                  {todoCount > 99 ? "99+" : todoCount}
                </span>
              )}
            </div>
            <div className={aStyle.formCardMeta}>
              {(board.syllabus || board.syllabusMeta) && (
                <span
                  className={`${aStyle.formCardBadge} ${aStyle.badgePending}`}
                  title={
                    board.syllabusMeta?.classTitle
                      ? `수업: ${board.syllabusMeta.classTitle}`
                      : "수업 연결 보드"
                  }
                >
                  수업
                  {board.syllabusMeta?.classTitle
                    ? ` · ${board.syllabusMeta.classTitle}`
                    : ""}
                </span>
              )}
              <span
                className={`${aStyle.formCardBadge} ${aStyle.badgeOptional}`}
              >
                {getBoardScopeLabel(board)}
              </span>
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
              <span>생성자 {board.creatorName?.trim() || "-"}</span>
              <span>게시글 {board.postCount ?? 0}개</span>
            </div>
          </div>
        </div>
        <div className={aStyle.formCardRight}>
          <button
            type="button"
            className={`${aStyle.formCardIconBtn} ${
              board.isFavorited ? bStyle.pinIconActive : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin(board);
            }}
            title={board.isFavorited ? "고정 해제" : "상단에 고정"}
            aria-label={board.isFavorited ? "고정 해제" : "상단에 고정"}
            aria-pressed={!!board.isFavorited}
          >
            <Svg type="pin" width="16px" height="16px" />
          </button>
          {canManageBoard(board) && (
            <>
              <button
                type="button"
                className={aStyle.formCardIconBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateBoard(board);
                }}
                title="보드 복제"
              >
                <Svg type="copy" width="16px" height="16px" />
              </button>
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
            </>
          )}
        </div>
      </div>
    );
  };

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
          <BoardListFilterBar
            keyword={boardKeyword}
            onKeywordChange={setBoardKeyword}
            sortBy={boardListSort}
            onSortByChange={handleBoardListSortChange}
            hasTodosOnly={hasTodosOnly}
            onHasTodosOnlyChange={setHasTodosOnly}
            scopeFilter={scopeFilter}
            onScopeFilterChange={setScopeFilter}
            boardTypeFilter={boardTypeFilter}
            onBoardTypeFilterChange={setBoardTypeFilter}
            linkFilter={linkFilter}
            onLinkFilterChange={setLinkFilter}
            counts={boardFilterCounts}
            onClear={clearBoardListFilters}
          />
          {boardListViewMode === "table" ? (
            displayBoards.length > 0 ? (
              <div className={aStyle.formCardList}>
                {pinnedBoards.length > 0 && (
                  <div className={bStyle.boardListSection}>
                    <div
                      className={bStyle.boardListSectionHeader}
                      role="heading"
                      aria-level={4}
                    >
                      <span
                        className={bStyle.boardListSectionHeaderPin}
                        aria-hidden
                      >
                        <Svg type="pin" width="12px" height="12px" />
                      </span>
                      고정 · {pinnedBoards.length}
                    </div>
                    {pinnedBoards.map((board) =>
                      renderBoardListCard(board, true)
                    )}
                  </div>
                )}
                {unpinnedBoards.length > 0 && (
                  <div className={bStyle.boardListSection}>
                    {pinnedBoards.length > 0 && (
                      <div
                        className={bStyle.boardListSectionHeader}
                        role="heading"
                        aria-level={4}
                      >
                        전체 · {unpinnedBoards.length}
                      </div>
                    )}
                    {unpinnedBoards.map((board) =>
                      renderBoardListCard(board, false)
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={aStyle.emptyState}>{emptyBoardMessage}</div>
            )
          ) : displayBoards.length > 0 ? (
            <BoardGalleryView
              boards={displayBoards}
              selectedBoard={null}
              onSelect={handleBoardClick}
              onTogglePin={handleTogglePin}
              onDuplicate={handleDuplicateBoard}
              onManage={handleManageBoard}
              canManageBoard={canManageBoard}
              todoCountByBoard={todoCountByBoard}
            />
          ) : (
            <div className={aStyle.emptyState}>{emptyBoardMessage}</div>
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

        {/* 기본 탭: 보드 (해시 있으면 해시 우선) */}
        {todosReady ? (
          <Tab
            items={{
              [boardTabKey]: boardListContent,
              [todoTabKey]: (
                <BoardsActivityTodos
                  items={todos}
                  loading={todosLoading}
                  onOpenTodo={handleOpenTodo}
                  onGoToBoards={handleGoToBoardsTab}
                />
              ),
            }}
            align="flex-start"
            defaultTab={boardTabKey}
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
          onDuplicateRequest={() => {
            setShowBoardManagePopup(false);
            setDuplicatingBoard(managingBoard);
          }}
        />
      )}
      {duplicatingBoard && (
        <BoardDuplicateFlow
          sourceBoard={duplicatingBoard}
          setState={(open) => {
            if (!open) setDuplicatingBoard(null);
          }}
          onSuccess={() => setIsLoading(true)}
        />
      )}
    </>
  );
};

export default Boards;
