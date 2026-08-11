import { TBoard } from "types/board";
import { sortBoardsForList } from "./boardListSort";

const board = (partial: Partial<TBoard> & { _id: string; name: string }): TBoard =>
  ({
    school: "s",
    schoolId: "sid",
    schoolName: "학교",
    description: "",
    slug: partial.name,
    members: { groups: { manager: true, teacher: true, student: true }, users: [] },
    writers: { groups: { manager: true, teacher: true, student: false }, users: [] },
    isDefault: false,
    isActive: true,
    order: 0,
    postCount: 0,
    contentViewMode: "table",
    boardType: "official",
    boardMode: "alt",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  }) as TBoard;

describe("sortBoardsForList", () => {
  test("pins favorited boards to the top before other sort keys", () => {
    const boards = [
      board({
        _id: "a",
        name: "가",
        isFavorited: false,
        postCount: 10,
      }),
      board({
        _id: "b",
        name: "나",
        isFavorited: true,
        postCount: 1,
      }),
      board({
        _id: "c",
        name: "다",
        isFavorited: false,
        postCount: 5,
      }),
    ];

    const sorted = sortBoardsForList(boards, "postCount");
    expect(sorted.map((b) => b._id)).toEqual(["b", "a", "c"]);
  });

  test("sorts by creator name under pinned groups", () => {
    const boards = [
      board({
        _id: "1",
        name: "1",
        creatorName: "홍길동",
        isFavorited: false,
      }),
      board({
        _id: "2",
        name: "2",
        creatorName: "김철수",
        isFavorited: false,
      }),
      board({
        _id: "3",
        name: "3",
        creatorName: "박영희",
        isFavorited: true,
      }),
    ];

    const sorted = sortBoardsForList(boards, "creatorName");
    expect(sorted.map((b) => b._id)).toEqual(["3", "2", "1"]);
  });
});
