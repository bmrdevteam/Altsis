import { TAltForm } from "types/altForm";
import { sortFormsForList } from "./activityListSort";

const form = (
  partial: Partial<TAltForm> & { _id: string; title: string }
): TAltForm =>
  ({
    board: "b",
    school: "s",
    creator: "u",
    creatorId: "uid",
    creatorName: "작성자",
    description: "",
    fields: [],
    settings: {},
    sheet: "sh",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
    settings: { ...(partial.settings || {}) },
  }) as TAltForm;

describe("sortFormsForList", () => {
  test("pins favorited forms to the top before other sort keys", () => {
    const forms = [
      form({ _id: "a", title: "가", isFavorited: false }),
      form({ _id: "b", title: "나", isFavorited: true }),
      form({ _id: "c", title: "다", isFavorited: false }),
    ];

    const sorted = sortFormsForList(forms, "title");
    expect(sorted.map((f) => f._id)).toEqual(["b", "a", "c"]);
  });

  test("uses pinnedIds override over isFavorited", () => {
    const forms = [
      form({ _id: "a", title: "가", isFavorited: true }),
      form({ _id: "b", title: "나", isFavorited: false }),
      form({ _id: "c", title: "다", isFavorited: false }),
    ];

    const sorted = sortFormsForList(forms, "title", new Set(["c"]));
    expect(sorted.map((f) => f._id)).toEqual(["c", "a", "b"]);
  });

  test("sorts by title under pinned groups", () => {
    const forms = [
      form({ _id: "1", title: "다", isFavorited: false }),
      form({ _id: "2", title: "가", isFavorited: false }),
      form({ _id: "3", title: "나", isFavorited: true }),
    ];

    const sorted = sortFormsForList(forms, "title");
    expect(sorted.map((f) => f._id)).toEqual(["3", "2", "1"]);
  });

  test("sorts by closeAt soonest first and missing last", () => {
    const forms = [
      form({
        _id: "none",
        title: "없음",
        settings: {},
      }),
      form({
        _id: "late",
        title: "늦음",
        settings: { closeAt: "2026-12-01T00:00:00.000Z" },
      }),
      form({
        _id: "soon",
        title: "임박",
        settings: { closeAt: "2026-06-01T00:00:00.000Z" },
      }),
    ];

    const sorted = sortFormsForList(forms, "closeAt");
    expect(sorted.map((f) => f._id)).toEqual(["soon", "late", "none"]);
  });

  test("default sort puts direct input after submit forms", () => {
    const forms = [
      form({
        _id: "direct",
        title: "직접",
        settings: { directInputMode: true },
      }),
      form({
        _id: "submit",
        title: "제출",
        settings: { requiredMode: true },
        mySubmitted: true,
      }),
    ];

    const sorted = sortFormsForList(forms, "default");
    expect(sorted.map((f) => f._id)).toEqual(["submit", "direct"]);
  });
});
