import {
  formatActivityAccessGroups,
  normalizeActivityDraftAccess,
  normalizeActivityDraftBundle,
  normalizeActivityDraftLinks,
} from "./activityDraft";

if (typeof globalThis.crypto?.randomUUID !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID: () => "00000000-0000-4000-8000-000000000001",
    },
  });
}

describe("normalizeActivityDraftLinks", () => {
  test("keeps http(s) and drops javascript", () => {
    expect(
      normalizeActivityDraftLinks([
        { url: "https://example.com/a", title: "예제" },
        { url: "javascript:alert(1)" },
        "http://school.example/b",
      ])
    ).toEqual([
      { url: "https://example.com/a", title: "예제" },
      { url: "http://school.example/b" },
    ]);
  });
});

describe("normalizeActivityDraftAccess", () => {
  test("board vs groups and writers subset", () => {
    expect(
      normalizeActivityDraftAccess({ members: "board", writers: "board" })
    ).toEqual({ members: "board", writers: "board" });
    const groups = normalizeActivityDraftAccess({
      members: { groups: ["student", "teacher"] },
      writers: { groups: ["teacher", "manager"] },
    });
    expect(groups?.members).toEqual({
      groups: { manager: false, teacher: true, student: true },
    });
    expect(groups?.writers).toEqual({
      groups: { manager: false, teacher: true, student: false },
    });
    expect(formatActivityAccessGroups(groups?.members)).toBe("교사·학생");
  });

  test("omits empty access", () => {
    expect(normalizeActivityDraftAccess(undefined)).toBeUndefined();
    expect(
      normalizeActivityDraftAccess({ members: { groups: [] } })
    ).toBeUndefined();
  });
});

describe("normalizeActivityDraftBundle", () => {
  test("keeps content links and access", () => {
    const bundle = normalizeActivityDraftBundle({
      fields: [
        {
          label: "안내",
          type: "content",
          content: "읽기",
          links: [{ url: "https://example.com", title: "참고" }],
        },
        { label: "이름", type: "text" },
      ],
      settings: { allowResubmit: true, allowMultipleResponses: true },
      access: { members: { groups: ["student"] }, writers: "board" },
    });
    expect(bundle.fields[0].links).toEqual([
      { url: "https://example.com/", title: "참고" },
    ]);
    expect(bundle.fields[1].links).toBeUndefined();
    expect(bundle.settings.allowResubmit).toBe(true);
    expect(bundle.settings.allowMultipleResponses).toBe(true);
    expect(bundle.access).toEqual({
      members: { groups: { manager: false, teacher: false, student: true } },
      writers: "board",
    });
  });
});
