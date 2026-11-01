import {
  canReuseAltFormSource,
  pickReusableForms,
  reuseSearchPattern,
  sortReusableForms,
} from "../../src/services/altFormReuse.js";

const oid = (id) => ({
  equals: (other) => String(other?._id ?? other) === id,
  toString: () => id,
});

const creatorUser = {
  _id: oid("creator-oid"),
  userId: "cre1",
  userName: "작성자",
  auth: "member",
};

const studentUser = {
  _id: oid("student-oid"),
  userId: "stu1",
  userName: "학생",
  auth: "member",
};

const otherUser = {
  _id: oid("other-oid"),
  userId: "oth1",
  userName: "기타",
  auth: "member",
};

const outsiderUser = {
  _id: oid("outsider-oid"),
  userId: "out1",
  userName: "외부",
  auth: "member",
};

const board = {
  _id: oid("board-1"),
  name: "동아리",
  creator: oid("creator-oid"),
  schoolId: "school1",
  members: {
    groups: { manager: false, teacher: false, student: false },
    users: [],
  },
  altBoardRole: {
    "student-oid": "respondent",
    "other-oid": "respondent",
  },
};

const published = {
  _id: oid("form-1"),
  title: "결석계",
  description: "출결",
  board: oid("board-1"),
  creator: oid("creator-oid"),
  isDraft: false,
  isActive: true,
  updatedAt: "2026-03-01T00:00:00.000Z",
};

describe("canReuseAltFormSource", () => {
  test("creator can reuse own published form and own draft", () => {
    expect(canReuseAltFormSource(published, board, creatorUser, "teacher")).toBe(
      true
    );
    expect(
      canReuseAltFormSource(
        { ...published, isDraft: true },
        board,
        creatorUser,
        "teacher"
      )
    ).toBe(true);
  });

  test("board member can reuse a published form shared through the board", () => {
    expect(canReuseAltFormSource(published, board, studentUser, "student")).toBe(
      true
    );
  });

  test("another person's draft and inactive form are not reusable", () => {
    expect(
      canReuseAltFormSource(
        { ...published, isDraft: true },
        board,
        studentUser,
        "student"
      )
    ).toBe(false);
    expect(
      canReuseAltFormSource(
        { ...published, isActive: false },
        board,
        creatorUser,
        "teacher"
      )
    ).toBe(false);
  });

  test("custom members exclude people who are not on the list", () => {
    const restricted = {
      ...published,
      members: {
        groups: { manager: false, teacher: false, student: true },
        users: [],
      },
    };
    expect(canReuseAltFormSource(restricted, board, studentUser, "student")).toBe(
      true
    );
    expect(canReuseAltFormSource(restricted, board, otherUser, "teacher")).toBe(
      false
    );
  });

  test("outsider and approver-only access cannot reuse", () => {
    expect(canReuseAltFormSource(published, board, outsiderUser, "student")).toBe(
      false
    );
  });
});

describe("reuse search and ordering", () => {
  test("escapes regex and ignores blank queries", () => {
    expect(reuseSearchPattern("  ")).toBeNull();
    expect(reuseSearchPattern("a.b")).toBe("a\\.b");
    expect(reuseSearchPattern("결석")).toBe("결석");
  });

  test("own forms come first, then recent shared forms", () => {
    const sorted = sortReusableForms([
      {
        title: "공유 최근",
        isMine: false,
        updatedAt: "2026-04-02T00:00:00.000Z",
      },
      {
        title: "내 예전",
        isMine: true,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        title: "공유 예전",
        isMine: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(sorted.map((form) => form.title)).toEqual([
      "내 예전",
      "공유 최근",
      "공유 예전",
    ]);
  });

  test("pick drops excluded ids and forms the user cannot reuse", () => {
    const boardsById = new Map([["board-1", board]]);
    const picked = pickReusableForms(
      [
        published,
        { ...published, _id: oid("form-2"), title: "현재 양식" },
        {
          ...published,
          _id: oid("form-3"),
          title: "다른 사람 초안",
          creator: oid("other-oid"),
          isDraft: true,
        },
      ],
      studentUser,
      boardsById,
      () => "student",
      { excludeId: "form-2", limit: 10 }
    );
    expect(picked.map((form) => form.title)).toEqual(["결석계"]);
    expect(picked[0].isMine).toBe(false);
    expect(picked[0].boardName).toBe("동아리");
  });
});
