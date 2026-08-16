import {
  filterOptionIndices,
  isAllVisibleSelected,
  toggleSelectAllVisible,
} from "./multiSelectOptions";

describe("filterOptionIndices", () => {
  const options = ["축구", "농구", "배드민턴"];

  test("empty query returns all indices", () => {
    expect(filterOptionIndices(options, "")).toEqual([0, 1, 2]);
    expect(filterOptionIndices(options, "   ")).toEqual([0, 1, 2]);
  });

  test("matches option label and is case-insensitive", () => {
    expect(filterOptionIndices(options, "축")).toEqual([0]);
    expect(filterOptionIndices(["Gym"], "gym")).toEqual([0]);
  });

  test("returns empty when nothing matches", () => {
    expect(filterOptionIndices(options, "수영")).toEqual([]);
  });

  test("treats missing options as empty", () => {
    expect(filterOptionIndices(undefined, "a")).toEqual([]);
  });

  test("checkFilter keeps only checked or unchecked", () => {
    expect(filterOptionIndices(options, "", "checked", ["축구"])).toEqual([0]);
    expect(filterOptionIndices(options, "", "unchecked", ["축구"])).toEqual([
      1, 2,
    ]);
    expect(filterOptionIndices(options, "", "all", ["축구"])).toEqual([
      0, 1, 2,
    ]);
  });

  test("applies search then checkFilter", () => {
    expect(
      filterOptionIndices(options, "농", "checked", ["축구", "농구"])
    ).toEqual([1]);
    expect(filterOptionIndices(options, "농", "unchecked", ["농구"])).toEqual(
      []
    );
  });
});

describe("toggleSelectAllVisible", () => {
  test("selects all visible and keeps hidden selections", () => {
    expect(toggleSelectAllVisible(["숨김"], ["축구", "농구"])).toEqual([
      "숨김",
      "축구",
      "농구",
    ]);
  });

  test("deselects only visible when all visible are selected", () => {
    expect(
      toggleSelectAllVisible(["숨김", "축구", "농구"], ["축구", "농구"])
    ).toEqual(["숨김"]);
  });

  test("does nothing when visible list is empty", () => {
    expect(toggleSelectAllVisible(["축구"], [])).toEqual(["축구"]);
  });
});

describe("isAllVisibleSelected", () => {
  test("false when visible is empty", () => {
    expect(isAllVisibleSelected(["a"], [])).toBe(false);
  });

  test("true only if every visible option is selected", () => {
    expect(isAllVisibleSelected(["a", "b"], ["a", "b"])).toBe(true);
    expect(isAllVisibleSelected(["a"], ["a", "b"])).toBe(false);
  });
});
