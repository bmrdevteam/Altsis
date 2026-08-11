import { TBoard } from "types/board";
import { TBoardListSort } from "./BoardListFilterBar";

const collator = new Intl.Collator("ko", { sensitivity: "base" });

const compareBySort = (a: TBoard, b: TBoard, sortBy: TBoardListSort): number => {
  switch (sortBy) {
    case "name":
      return collator.compare(a.name || "", b.name || "");
    case "updatedAt":
      return (
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime()
      );
    case "createdAt":
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    case "postCount":
      return (b.postCount || 0) - (a.postCount || 0);
    case "creatorName":
      return collator.compare(a.creatorName || "", b.creatorName || "");
    case "default":
    default:
      return 0;
  }
};

/** 고정(핀) 보드를 항상 상단에 두고, 그 아래에서 sortBy를 적용한다. */
export const sortBoardsForList = (
  boards: TBoard[],
  sortBy: TBoardListSort
): TBoard[] => {
  return [...boards].sort((a, b) => {
    const pin = Number(!!b.isFavorited) - Number(!!a.isFavorited);
    if (pin !== 0) return pin;
    return compareBySort(a, b, sortBy);
  });
};
