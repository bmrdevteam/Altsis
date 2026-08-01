import { hrefForGoalItem } from "./goalHref";

describe("hrefForGoalItem", () => {
  test("courses tabs use hash routes", () => {
    expect(hrefForGoalItem({ sectionKey: "enrolled", label: "x" })).toBe(
      "/courses#수강 현황"
    );
    expect(hrefForGoalItem({ sectionKey: "created", label: "x" })).toBe(
      "/courses#개설 수업"
    );
    expect(hrefForGoalItem({ sectionKey: "mentoring", label: "x" })).toBe(
      "/courses#담당 수업"
    );
  });

  test("archive always goes to myArchive and encodes label", () => {
    expect(
      hrefForGoalItem({
        sectionKey: "archive",
        itemId: "archive:봉사/활동",
        label: "봉사/활동",
      })
    ).toBe(`/myArchive/${encodeURIComponent("봉사/활동")}`);
  });

  test("board overall vs form boardId", () => {
    expect(
      hrefForGoalItem({
        sectionKey: "board",
        itemId: "board:전체 할 일",
        label: "전체 할 일",
      })
    ).toBe("/boards#할 일");
    expect(
      hrefForGoalItem({
        sectionKey: "board",
        itemId: "board:form:f1",
        label: "양식",
        boardId: "b1",
      })
    ).toBe("/boards/b1");
  });
});
