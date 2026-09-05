/**
 * @file Board Detail Page
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import style from "style/pages/enrollment.module.scss";
import bStyle from "./boards.module.scss";

import Svg from "assets/svg/Svg";

import { TBoard } from "types/board";
import { resolveBoardCoverColor } from "utils/boardCoverColor";
import { getBoardCourseSurfacePath } from "utils/boardCoursePath";

import BoardManagePopup from "./popup/BoardManage";
import BoardDuplicateFlow from "./popup/BoardDuplicateFlow";
import UserListPopup from "./popup/UserListPopup";
import AltBoardView from "./altBoard/AltBoardView";

const COURSE_SURFACES = new Set(["활동", "문서", "채팅"]);

/** 레거시 #기록 → 활동 (기록 탭 제거 호환) */
const normalizeCourseSurface = (hash: string): string | null => {
  if (hash === "기록") return "활동";
  if (COURSE_SURFACES.has(hash)) return hash;
  return null;
};

const BoardPid = () => {
  const navigate = useAppNavigate();
  const location = useLocation();
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  const { currentUser, currentRegistration } = useAuth();
  const { BoardAPI } = useAPIv2();

  const [board, setBoard] = useState<TBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showManagePopup, setShowManagePopup] = useState(false);
  const [showMemberListPopup, setShowMemberListPopup] = useState(false);
  const [showDuplicateFlow, setShowDuplicateFlow] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);

  const isManager =
    currentUser?.auth === "admin" || currentUser?.auth === "manager";

  const canManageBoard = (b: TBoard) => {
    if (isManager) return true;
    if (b.creator && String(b.creator) === String(currentUser?._id)) {
      return true;
    }
    const uid = currentUser?._id ? String(currentUser._id) : "";
    if (uid && b.altBoardRole?.[uid] === "admin") return true;
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
      })
      .catch((err) => {
        ALERT_ERROR(err);
        navigate("/boards", { replace: true });
      });
  }, [boardId]);

  // 수업 연결 보드의 정식 화면은 수업 상세 — query(boardChatRoom 등)·해시 보존
  // boardChatRoom이 있어도 보드 UI를 띄우지 않고 바로 수업으로 보낸다(채팅→계획서 경합 방지).
  useEffect(() => {
    if (!board) return;
    if (
      searchParams.has("form") ||
      searchParams.has("sheet") ||
      searchParams.has("approval") ||
      searchParams.has("row")
    ) {
      return;
    }
    let hash = "";
    try {
      hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    } catch {
      hash = location.hash.replace(/^#/, "");
    }
    const surface =
      normalizeCourseSurface(hash) ??
      (searchParams.has("boardChatRoom") ? "채팅" : "활동");
    const coursePath = getBoardCourseSurfacePath(board, surface);
    if (coursePath) {
      const [pathOnly, hashPart] = coursePath.split("#");
      navigate(
        {
          pathname: pathOnly,
          search: searchParams.toString()
            ? `?${searchParams.toString()}`
            : "",
          hash: hashPart || surface,
        },
        { replace: true }
      );
    }
  }, [board, searchParams, location.hash, navigate]);

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

  useEffect(() => {
    if (!headerMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        headerMenuRef.current &&
        !headerMenuRef.current.contains(e.target as Node)
      ) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [headerMenuOpen]);

  const shouldStayOnBoard =
    searchParams.has("form") ||
    searchParams.has("sheet") ||
    searchParams.has("approval") ||
    searchParams.has("row");
  const courseRedirectSurface = (() => {
    let hash = "";
    try {
      hash = decodeURIComponent(location.hash.replace(/^#/, ""));
    } catch {
      hash = location.hash.replace(/^#/, "");
    }
    const normalized = normalizeCourseSurface(hash);
    if (normalized) return normalized;
    if (searchParams.has("boardChatRoom")) return "채팅";
    return "활동";
  })();
  const courseRedirectPath =
    board && !shouldStayOnBoard
      ? getBoardCourseSurfacePath(board, courseRedirectSurface)
      : null;

  // 수업으로 보내는 동안 보드 UI 플래시 방지
  if (isLoading || !board || courseRedirectPath) return null;

  return (
    <>
      <div className={`${style.section} ${bStyle.page}`}>
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
                <div
                  className={bStyle.boardColorDot}
                  style={{
                    backgroundColor: resolveBoardCoverColor(
                      board.coverColor,
                      board._id || board.name
                    ),
                    width: "12px",
                    height: "12px",
                  }}
                />
                {board.name}
              </div>
              {board.description && (
                <p className={bStyle.detailDescription}>
                  {board.description}
                </p>
              )}
              {(board.syllabus || board.syllabusMeta) && (
                <div className={bStyle.syllabusLinkBanner}>
                  <span>
                    「{board.syllabusMeta?.classTitle || board.name}」 수업에
                    연결된 보드입니다.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className={bStyle.detailHeaderRight}>
            <div className={bStyle.headerMenu} ref={headerMenuRef}>
              <button
                type="button"
                className={bStyle.iconBtn}
                title="더보기"
                aria-label="더보기"
                aria-expanded={headerMenuOpen}
                aria-haspopup="menu"
                onClick={() => setHeaderMenuOpen((v) => !v)}
              >
                <Svg type="verticalDots" width="18px" height="18px" />
              </button>
              {headerMenuOpen && (
                <div className={bStyle.headerActionMenu} role="menu">
                  <button
                    type="button"
                    className={bStyle.headerActionItem}
                    role="menuitem"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      setShowMemberListPopup(true);
                    }}
                  >
                    <Svg type="users" width="16px" height="16px" />
                    보드 멤버
                  </button>
                  {canManageBoard(board) && (
                    <button
                      type="button"
                      className={bStyle.headerActionItem}
                      role="menuitem"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        setShowManagePopup(true);
                      }}
                    >
                      <Svg type="settings" width="16px" height="16px" />
                      보드 관리
                    </button>
                  )}
                  {!canManageBoard(board) && !board.isDefault && (
                    <button
                      type="button"
                      className={`${bStyle.headerActionItem} ${bStyle.headerActionItemDanger}`}
                      role="menuitem"
                      onClick={() => {
                        setHeaderMenuOpen(false);
                        handleLeaveBoard();
                      }}
                    >
                      <Svg type="logout" width="16px" height="16px" />
                      나가기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <AltBoardView board={board} />
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
          onDuplicateRequest={() => {
            setShowManagePopup(false);
            setShowDuplicateFlow(true);
          }}
        />
      )}
      {showDuplicateFlow && (
        <BoardDuplicateFlow
          sourceBoard={board}
          setState={setShowDuplicateFlow}
          onSuccess={() => navigate("/boards")}
        />
      )}

      {showMemberListPopup && (
        <UserListPopup
          title="보드 멤버"
          setState={setShowMemberListPopup}
          fetchUsers={() =>
            BoardAPI.RBoardMemberList({
              params: { _id: board._id },
              query: { season: currentRegistration?.season },
            })
          }
        />
      )}
    </>
  );
};

export default BoardPid;
