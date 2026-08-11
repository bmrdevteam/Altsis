import Svg from "assets/svg/Svg";
import { TBoard } from "types/board";
import { resolveBoardCoverColor } from "utils/boardCoverColor";
import { getBoardScopeLabel } from "utils/boardLabels";
import style from "./boardGalleryView.module.scss";

type Props = {
  boards: TBoard[];
  selectedBoard: TBoard | null;
  onSelect: (board: TBoard) => void;
  onTogglePin: (board: TBoard) => void;
  onDuplicate?: (board: TBoard) => void;
  onManage?: (board: TBoard) => void;
  canManageBoard?: (board: TBoard) => boolean;
  todoCountByBoard?: Record<string, number>;
};

const BoardGalleryView = ({
  boards,
  selectedBoard,
  onSelect,
  onTogglePin,
  onDuplicate,
  onManage,
  canManageBoard,
  todoCountByBoard,
}: Props) => {
  if (boards.length === 0) {
    return <div className={style.empty}>보드가 없습니다.</div>;
  }

  const pinnedBoards = boards.filter((b) => b.isFavorited);
  const unpinnedBoards = boards.filter((b) => !b.isFavorited);

  const renderCard = (board: TBoard) => {
    const todoCount = todoCountByBoard?.[board._id] || 0;
    const manageable = canManageBoard?.(board);
    const pinned = !!board.isFavorited;
    return (
      <div
        key={board._id}
        className={`${style.card} ${pinned ? style.cardPinned : ""} ${
          selectedBoard?._id === board._id ? style.selected : ""
        }`}
        onClick={() => onSelect(board)}
      >
        <div
          className={style.cardCover}
          style={{
            backgroundImage: board.coverImage
              ? `url(${board.coverImage})`
              : undefined,
            backgroundColor: !board.coverImage
              ? resolveBoardCoverColor(
                  board.coverColor,
                  board._id || board.name
                )
              : undefined,
          }}
        />

        <div className={style.cardBody}>
          <button
            type="button"
            className={`${style.pinBtn} ${pinned ? style.active : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(board);
            }}
            title={pinned ? "고정 해제" : "상단에 고정"}
            aria-label={pinned ? "고정 해제" : "상단에 고정"}
            aria-pressed={pinned}
          >
            <Svg type="pin" width="16px" height="16px" />
          </button>

          <div className={style.cardName}>
            {board.isDefault && "📢 "}
            {board.name}
            {todoCount > 0 && (
              <span
                className={style.todoBadge}
                title={`할 일 ${todoCount}건`}
                aria-label={`할 일 ${todoCount}건`}
              >
                {todoCount > 99 ? "99+" : todoCount}
              </span>
            )}
            {(board.syllabus || board.syllabusMeta) && (
              <span
                className={`${style.badge} ${style.badgeSyllabus}`}
                title={
                  board.syllabusMeta?.classTitle
                    ? `수업: ${board.syllabusMeta.classTitle}`
                    : "수업 연결 보드"
                }
              >
                수업
              </span>
            )}
            <span className={`${style.badge} ${style.badgeUser}`}>
              {getBoardScopeLabel(board)}
            </span>
            {board.boardType === "user" && (
              <span className={`${style.badge} ${style.badgeUser}`}>
                사용자
              </span>
            )}
          </div>

          {board.description && (
            <div className={style.cardDescription}>{board.description}</div>
          )}

          <div className={style.cardFooter}>
            <div className={style.cardMeta}>
              <span>생성자 {board.creatorName?.trim() || "-"}</span>
              <span>게시글 {board.postCount ?? 0}개</span>
            </div>
            {manageable && (onDuplicate || onManage) && (
              <div
                style={{ display: "flex", gap: 4 }}
                onClick={(e) => e.stopPropagation()}
              >
                {onDuplicate && (
                  <button
                    type="button"
                    title="보드 복제"
                    onClick={() => onDuplicate(board)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--text-color-2)",
                    }}
                  >
                    <Svg type="copy" width="16px" height="16px" />
                  </button>
                )}
                {onManage && (
                  <button
                    type="button"
                    title="보드 관리"
                    onClick={() => onManage(board)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--text-color-2)",
                    }}
                  >
                    <Svg type="settings" width="16px" height="16px" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={style.sections}>
      {pinnedBoards.length > 0 && (
        <section className={style.section} aria-label="고정 보드">
          <div className={style.sectionHeader}>
            <span className={style.sectionHeaderPin} aria-hidden>
              <Svg type="pin" width="12px" height="12px" />
            </span>
            고정 · {pinnedBoards.length}
          </div>
          <div className={style.container}>{pinnedBoards.map(renderCard)}</div>
        </section>
      )}
      {unpinnedBoards.length > 0 && (
        <section className={style.section} aria-label="보드 목록">
          {pinnedBoards.length > 0 && (
            <div className={style.sectionHeader}>
              전체 · {unpinnedBoards.length}
            </div>
          )}
          <div className={style.container}>
            {unpinnedBoards.map(renderCard)}
          </div>
        </section>
      )}
    </div>
  );
};

export default BoardGalleryView;
