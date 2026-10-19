import { normalizeClientGuideLinks } from "./normalizeGuideLinks";

describe("normalizeClientGuideLinks", () => {
  test("상대 경로만 남기고 최대 4개", () => {
    const out = normalizeClientGuideLinks([
      { kind: "page", title: "문서", path: "/docs" },
      { kind: "guide", title: "안내: 문서", path: "/guide?doc=user-guide%2Fdocs" },
      { kind: "guide", title: "악성", path: "https://evil.example" },
      { kind: "page", title: "문서", path: "/docs" },
      { kind: "page", title: "보드", path: "/boards" },
      { kind: "page", title: "수업", path: "/courses" },
      { kind: "guide", title: "안내: 수업", path: "/guide?doc=user-guide%2Fcourses" },
    ]);
    expect(out).toHaveLength(4);
    expect(out.every((l) => l.path.startsWith("/") && !l.path.startsWith("//"))).toBe(
      true
    );
    expect(out.some((l) => l.path.includes("evil"))).toBe(false);
  });

  test("https 출처는 화면 링크와 따로 남긴다", () => {
    const out = normalizeClientGuideLinks([
      { kind: "page", title: "문서", path: "/docs" },
      { kind: "web", title: "공공 날씨 안내", path: "https://example.com/weather" },
      { kind: "web", title: "평문", path: "http://example.com/weather" },
      { kind: "guide", title: "악성", path: "https://evil.example" },
    ]);
    expect(out).toEqual([
      { kind: "page", title: "문서", path: "/docs" },
      { kind: "web", title: "공공 날씨 안내", path: "https://example.com/weather" },
    ]);
  });
});
