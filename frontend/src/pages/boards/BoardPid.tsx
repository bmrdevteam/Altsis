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

import { useEffect, useState } from "react";
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
import UserListPopup from "./popup/UserListPopup";
import AltBoardView from "./altBoard/AltBoardView";

const COURSE_SURFACES = new Set(["활동", "기록", "문서", "채팅"]);

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

  // 양식 응답/편집·기록 상세 화면에서는 보드 상단바 숨김
  const hideBoardHeader =
    searchParams.has("form") || searchParams.has("sheet");

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
      })
      .catch((err) => {
        ALERT_ERROR(err);
        navigate("/boards", { replace: true });
      });
  }, [boardId]);

  // 수업 연결 보드의 정식 화면은 수업 상세 — 딥링크(form/sheet/approval)만 보드 URL 유지
  useEffect(() => {
    if (!board) return;
    if (
      searchParams.has("form") ||
      searchParams.has("sheet") ||
      searchParams.has("approval")
    ) {
      return;
    }
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    const surface = COURSE_SURFACES.has(hash) ? hash : "활동";
    const coursePath = getBoardCourseSurfacePath(board, surface);
    if (coursePath) {
      navigate(coursePath, { replace: true });
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

  const hasBoardDeepLink =
    searchParams.has("form") ||
    searchParams.has("sheet") ||
    searchParams.has("approval");
  const courseRedirectSurface = (() => {
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    return COURSE_SURFACES.has(hash) ? hash : "활동";
  })();
  const courseRedirectPath =
    board && !hasBoardDeepLink
      ? getBoardCourseSurfacePath(board, courseRedirectSurface)
      : null;

  // 수업으로 보내는 동안 보드 UI 플래시 방지
  if (isLoading || !board || courseRedirectPath) return null;

  return (
    <>
      <div className={`${style.section} ${bStyle.page}`}>
        {/* 보드 헤더 (양식 응답/편집 중에는 숨김) */}
        {!hideBoardHeader && (
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
              <button
                className={bStyle.iconBtn}
                onClick={() => setShowMemberListPopup(true)}
                title="멤버 보기"
              >
                <Svg type="users" width="18px" height="18px" />
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
        )}

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
