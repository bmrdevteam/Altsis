import { reorderIds, sortByItemOrder, syncItemOrder } from "./goalItemOrder";

describe("syncItemOrder", () => {
  test("keeps stored order and appends new enabled ids", () => {
    expect(
      syncItemOrder(
        ["b", "a", "gone"],
        ["a", "b", "c"]
      )
    ).toEqual(["b", "a", "c"]);
  });

  test("empty stored → catalog order", () => {
    expect(syncItemOrder([], ["a", "b"])).toEqual(["a", "b"]);
    expect(syncItemOrder(null, ["a"])).toEqual(["a"]);
  });
});

describe("sortByItemOrder", () => {
  test("sorts by order and keeps relative order for unknowns", () => {
    const items = [
      { id: "a" },
      { id: "b" },
      { id: "c" },
      { id: "d" },
    ];
    expect(sortByItemOrder(items, ["c", "a"]).map((i) => i.id)).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });

  test("no order → original", () => {
    const items = [{ id: "a" }, { id: "b" }];
    expect(sortByItemOrder(items, [])).toEqual(items);
  });
});

describe("reorderIds", () => {
  test("moves item to insert index", () => {
    expect(reorderIds(["a", "b", "c", "d"], 0, 3)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
    expect(reorderIds(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });
});
