import { TBoard } from "types/board";
import { resolveBoardCoverColor } from "utils/boardCoverColor";
import { getBoardScopeLabel } from "utils/boardLabels";
import style from "./boardGalleryView.module.scss";

type Props = {
  boards: TBoard[];
  selectedBoard: TBoard | null;
  onSelect: (board: TBoard) => void;
  onToggleFavorite: (board: TBoard) => void;
  todoCountByBoard?: Record<string, number>;
};

const BoardGalleryView = ({
  boards,
  selectedBoard,
  onSelect,
  onToggleFavorite,
  todoCountByBoard,
}: Props) => {
  if (boards.length === 0) {
    return <div className={style.empty}>보드가 없습니다.</div>;
  }

  return (
    <div className={style.container}>
      {boards.map((board) => {
        const todoCount = todoCountByBoard?.[board._id] || 0;
        return (
        <div
          key={board._id}
          className={`${style.card} ${
            selectedBoard?._id === board._id ? style.selected : ""
          }`}
          onClick={() => onSelect(board)}
        >
          {/* 커버 영역 — 이미지 없으면 플레이스홀더 색상 */}
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
              className={`${style.favoriteBtn} ${
                board.isFavorited ? style.active : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(board);
              }}
            >
              {board.isFavorited ? "★" : "☆"}
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
                <span>게시글 {board.postCount ?? 0}개</span>
                {board.creatorName && <span>by {board.creatorName}</span>}
              </div>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default BoardGalleryView;
