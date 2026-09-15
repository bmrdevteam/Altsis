import {
  FILTER_BAR_OPEN_KEYS,
  filterBarOpenStorageKey,
  readFilterBarOpen,
  writeFilterBarOpen,
} from "./filterBarOpen";

describe("filterBarOpen", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("storage key is namespaced per surface", () => {
    expect(filterBarOpenStorageKey(FILTER_BAR_OPEN_KEYS.boards)).toBe(
      "filterBarOpen:boards"
    );
  });

  test("missing value defaults to open", () => {
    expect(readFilterBarOpen(FILTER_BAR_OPEN_KEYS.boards)).toBe(true);
  });

  test("writes and reads collapsed state", () => {
    writeFilterBarOpen(FILTER_BAR_OPEN_KEYS.activity, false);
    expect(readFilterBarOpen(FILTER_BAR_OPEN_KEYS.activity)).toBe(false);
    writeFilterBarOpen(FILTER_BAR_OPEN_KEYS.activity, true);
    expect(readFilterBarOpen(FILTER_BAR_OPEN_KEYS.activity)).toBe(true);
  });

  test("surfaces do not share stored values", () => {
    writeFilterBarOpen(FILTER_BAR_OPEN_KEYS.boards, false);
    expect(readFilterBarOpen(FILTER_BAR_OPEN_KEYS.docs)).toBe(true);
  });
});
