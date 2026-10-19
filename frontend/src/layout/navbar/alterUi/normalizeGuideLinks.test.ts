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

  test("빈 제목과 http, 중복, 여섯 번째는 빠진다", () => {
    const rows = [
      { kind: "web" as const, title: "하나", path: "https://example.com/1" },
      { kind: "web" as const, title: "하나", path: "https://example.com/1" },
      { kind: "web" as const, title: "둘", path: "http://example.com/2" },
      { kind: "web" as const, title: "   ", path: "https://example.com/blank" },
      { kind: "web" as const, title: "공백", path: "https://example.com/a b" },
      { kind: "web" as const, title: "셋", path: "https://example.com/3" },
      { kind: "web" as const, title: "넷", path: "https://example.com/4" },
      { kind: "web" as const, title: "다섯", path: "https://example.com/5" },
      { kind: "web" as const, title: "여섯", path: "https://example.com/6" },
      { kind: "web" as const, title: "일곱", path: "https://example.com/7" },
    ];
    expect(normalizeClientGuideLinks(rows).map((link) => link.path)).toEqual([
      "https://example.com/1",
      "https://example.com/3",
      "https://example.com/4",
      "https://example.com/5",
      "https://example.com/6",
    ]);
  });
});
