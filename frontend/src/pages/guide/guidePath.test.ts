import { GUIDE_DOCS } from "./guideDocs.generated";
import {
  allowedGuideSet,
  defaultGuidePath,
  docKeyFromSearch,
  elementIdFromHash,
  guideBaseFromPathname,
  guideDocTitle,
  guideHref,
  guideKeyToUrl,
  isGuideInternalHref,
  parseGuideToc,
  posixNormalize,
  queryByHashId,
  resolveGuideHref,
  restAfterGuide,
  rewriteGuideMarkdownLinks,
  urlToGuideKey,
} from "./guidePath";

const DOCS: Record<string, string> = {
  "INDEX.md": `# 목차
### 1. [시작하기](getting-started/README.md)
| 문서 | 설명 |
|------|------|
| [빠른 시작](getting-started/quick-start.md) | 요약 |
#### 참고
| 문서 | 설명 |
|------|------|
| [양식 매뉴얼](../docs/alt-board-form-manual.md) | 매뉴얼 |
`,
  "getting-started/README.md": "[요구사항](requirements.md) [관리자](../admin-guide/README.md)",
  "getting-started/quick-start.md": "go",
  "getting-started/requirements.md": "req",
  "admin-guide/README.md": "admin",
  "user-guide/README.md": "user",
  "user-guide/boards.md": "boards",
  "docs/alt-board-form-manual.md": "manual",
};

const ALLOWED = allowedGuideSet(DOCS);

describe("defaultGuidePath", () => {
  test("비로그인은 INDEX", () => {
    expect(defaultGuidePath()).toBe("INDEX.md");
    expect(defaultGuidePath(null)).toBe("INDEX.md");
  });

  test("역할별 기본 문서", () => {
    expect(defaultGuidePath("owner")).toBe("getting-started/README.md");
    expect(defaultGuidePath("admin")).toBe("admin-guide/README.md");
    expect(defaultGuidePath("manager")).toBe("admin-guide/README.md");
    expect(defaultGuidePath("member")).toBe("user-guide/README.md");
  });
});

describe("posixNormalize / allowlist", () => {
  test("rejects NUL", () => {
    expect(posixNormalize("a\0b")).toBe(null);
  });

  test("collapses dots and leading parent of documentation root", () => {
    expect(posixNormalize("user-guide/./boards.md")).toBe("user-guide/boards.md");
    expect(posixNormalize("../docs/alt-board-form-manual.md")).toBe(
      "docs/alt-board-form-manual.md"
    );
  });

  test("unknown paths stay outside the allowlist", () => {
    expect(urlToGuideKey("../../backend/src/index.js", ALLOWED)).toBe(null);
    expect(urlToGuideKey("secret.md", ALLOWED)).toBe(null);
  });
});

describe("url and href resolution", () => {
  test("maps pretty URLs to keys", () => {
    expect(urlToGuideKey("user-guide/boards", ALLOWED)).toBe(
      "user-guide/boards.md"
    );
    expect(urlToGuideKey("getting-started", ALLOWED)).toBe(
      "getting-started/README.md"
    );
    expect(urlToGuideKey("", ALLOWED)).toBe("INDEX.md");
    expect(guideKeyToUrl("INDEX.md")).toBe("");
    expect(guideKeyToUrl("getting-started/README.md")).toBe("getting-started");
  });

  test("resolves relative markdown links from the current doc", () => {
    expect(
      resolveGuideHref("user-guide/README.md", "boards.md", ALLOWED)
    ).toBe("user-guide/boards.md");
    expect(
      resolveGuideHref(
        "getting-started/README.md",
        "../admin-guide/README.md",
        ALLOWED
      )
    ).toBe("admin-guide/README.md");
    expect(
      resolveGuideHref(
        "INDEX.md",
        "../docs/alt-board-form-manual.md",
        ALLOWED
      )
    ).toBe("docs/alt-board-form-manual.md");
  });

  test("leaves external links alone", () => {
    expect(
      resolveGuideHref("INDEX.md", "https://example.com/a.md", ALLOWED)
    ).toBe(null);
    expect(resolveGuideHref("INDEX.md", "#목차", ALLOWED)).toBe(null);
  });
});

describe("rewriteGuideMarkdownLinks", () => {
  test("rewrites relative md links and keeps images", () => {
    const out = rewriteGuideMarkdownLinks(
      "see [보드](boards.md) ![img](pic.png)",
      "user-guide/README.md",
      ALLOWED,
      "/guide"
    );
    expect(out).toContain("[보드](/guide?doc=user-guide%2Fboards)");
    expect(out).toContain("![img](pic.png)");
  });

  test("keeps in-page hash links", () => {
    const out = rewriteGuideMarkdownLinks(
      "- [개요](#개요)\n- [DM](#dm-11-채팅)",
      "user-guide/chat.md",
      ALLOWED,
      "/guide"
    );
    expect(out).toContain("[개요](#개요)");
    expect(out).toContain("[DM](#dm-11-채팅)");
  });
});

describe("parseGuideToc", () => {
  test("builds sections from INDEX headings and tables", () => {
    const toc = parseGuideToc(DOCS["INDEX.md"], ALLOWED);
    expect(toc[0].title).toBe("시작하기");
    expect(toc[0].key).toBe("getting-started/README.md");
    expect(toc[0].items.map((i) => i.key)).toEqual([
      "getting-started/quick-start.md",
      "docs/alt-board-form-manual.md",
    ]);
  });
});

describe("pathname helpers", () => {
  test("reads /guide and school-prefixed /guide", () => {
    expect(guideBaseFromPathname("/guide/user-guide/boards")).toBe("/guide");
    expect(restAfterGuide("/guide/user-guide/boards")).toBe("user-guide/boards");
    expect(guideBaseFromPathname("/ac1/sch1/guide/getting-started")).toBe(
      "/ac1/sch1/guide"
    );
    expect(restAfterGuide("/ac1/sch1/guide")).toBe("");
  });

  test("detects internal guide hrefs", () => {
    expect(isGuideInternalHref("/guide?doc=user-guide/boards", "/guide")).toBe(
      true
    );
    expect(isGuideInternalHref("https://example.com/x", "/guide")).toBe(false);
  });
});

describe("query doc selection", () => {
  test("builds hrefs that do not collide with app routes", () => {
    expect(guideHref("/guide", "user-guide/courses.md")).toBe(
      "/guide?doc=user-guide%2Fcourses"
    );
    expect(guideHref("/guide", "INDEX.md")).toBe("/guide");
    expect(guideHref("/ac1/sch1/guide", "user-guide/notifications.md")).toBe(
      "/ac1/sch1/guide?doc=user-guide%2Fnotifications"
    );
  });

  test("reads doc from search", () => {
    expect(docKeyFromSearch("", ALLOWED)).toEqual({
      present: false,
      key: null,
    });
    expect(docKeyFromSearch("?doc=user-guide%2Fboards", ALLOWED)).toEqual({
      present: true,
      key: "user-guide/boards.md",
    });
  });

  test("resolves rewritten query hrefs", () => {
    expect(
      resolveGuideHref(
        "INDEX.md",
        "/guide?doc=user-guide%2Fboards",
        ALLOWED
      )
    ).toBe("user-guide/boards.md");
  });
});

describe("in-page hash targets", () => {
  test("decodes hash fragments used by documentation TOC", () => {
    expect(elementIdFromHash("#개요")).toBe("개요");
    expect(elementIdFromHash("#dm-11-채팅")).toBe("dm-11-채팅");
    expect(elementIdFromHash("#%EA%B0%9C%EC%9A%94")).toBe("개요");
    expect(elementIdFromHash("")).toBe(null);
    expect(elementIdFromHash("#")).toBe(null);
  });

  test("finds the heading that matches a TOC hash", () => {
    const root = document.createElement("div");
    root.innerHTML = '<h2 id="개요">개요</h2><h2 id="dm-11-채팅">DM</h2>';
    expect(queryByHashId(root, "#개요")?.id).toBe("개요");
    expect(queryByHashId(root, "#dm-11-채팅")?.textContent).toBe("DM");
    expect(queryByHashId(root, "#없는-제목")).toBe(null);
  });
});

describe("guideDocTitle", () => {
  test("첫 제목에서 장식 문자를 뺀다", () => {
    expect(guideDocTitle("# 문서 ⚪\n\n본문")).toBe("문서");
    expect(guideDocTitle("", "안내")).toBe("안내");
  });
});

describe("generated snapshot", () => {
  test("includes INDEX and extra manuals", () => {
    expect(GUIDE_DOCS["INDEX.md"]).toContain("Altsis 공식 문서");
    expect(GUIDE_DOCS["user-guide/docs.md"]).toBeTruthy();
    expect(GUIDE_DOCS["user-guide/goals.md"]).toBeTruthy();
    expect(GUIDE_DOCS["docs/alt-board-form-manual.md"]).toBeTruthy();
    expect(GUIDE_DOCS["docs/reservation-feature-design.md"]).toBeTruthy();
  });

  test("INDEX toc includes user and admin guides", () => {
    const toc = parseGuideToc(
      GUIDE_DOCS["INDEX.md"],
      allowedGuideSet(GUIDE_DOCS)
    );
    const titles = toc.map((s) => s.title);
    expect(titles).toEqual(
      expect.arrayContaining(["시작하기", "관리자 가이드", "사용자 가이드"])
    );
    const extra = toc.flatMap((s) => s.items).map((i) => i.key);
    expect(extra).toContain("user-guide/docs.md");
    expect(extra).toContain("user-guide/goals.md");
    expect(extra).toContain("docs/alt-board-form-manual.md");
  });
});
