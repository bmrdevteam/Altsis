import { TBoard } from "types/board";
import style from "./boardGalleryView.module.scss";

type Props = {
  boards: TBoard[];
  selectedBoard: TBoard | null;
  onSelect: (board: TBoard) => void;
  onToggleFavorite: (board: TBoard) => void;
};

const BoardGalleryView = ({
  boards,
  selectedBoard,
  onSelect,
  onToggleFavorite,
}: Props) => {
  if (boards.length === 0) {
    return <div className={style.empty}>보드가 없습니다.</div>;
  }

  return (
    <div className={style.container}>
      {boards.map((board) => (
        <div
          key={board._id}
          className={`${style.card} ${
            selectedBoard?._id === board._id ? style.selected : ""
          }`}
          onClick={() => onSelect(board)}
        >
          {/* 커버 영역 */}
          {(board.coverImage || board.coverColor) && (
            <div
              className={style.cardCover}
              style={{
                backgroundImage: board.coverImage
                  ? `url(${board.coverImage})`
                  : undefined,
                backgroundColor: !board.coverImage
                  ? board.coverColor
                  : undefined,
              }}
            />
          )}

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
      ))}
    </div>
  );
};

export default BoardGalleryView;
