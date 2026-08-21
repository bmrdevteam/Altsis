import {
  buildAlterGuideLinks,
  guideDocPath,
  isSafeAppPath,
  normalizeAlterGuideLinks,
} from "../../src/services/alterGuideLinks.js";

describe("guideDocPath", () => {
  test("INDEX는 /guide, 문서는 doc 쿼리", () => {
    expect(guideDocPath("INDEX.md")).toBe("/guide");
    expect(guideDocPath("user-guide/docs.md")).toBe(
      "/guide?doc=user-guide%2Fdocs"
    );
    expect(guideDocPath("user-guide/README.md")).toBe("/guide?doc=user-guide");
  });
});

describe("isSafeAppPath", () => {
  test("앱 상대 경로만 허용", () => {
    expect(isSafeAppPath("/docs")).toBe(true);
    expect(isSafeAppPath("/guide?doc=user-guide%2Fdocs")).toBe(true);
    expect(isSafeAppPath("//evil.example")).toBe(false);
    expect(isSafeAppPath("https://example.com")).toBe(false);
  });
});

describe("buildAlterGuideLinks", () => {
  const teacher = {
    user: { auth: "member" },
    school: { boardEnabled: true, goalsEnabled: true },
    registration: { role: "teacher", permissionSyllabusV2: true },
  };

  test("문서 안내에 화면과 가이드 링크를 붙인다", () => {
    const links = buildAlterGuideLinks(
      [{ key: "user-guide/docs.md" }],
      teacher
    );
    expect(links).toEqual(
      expect.arrayContaining([
        { kind: "page", title: "문서", path: "/docs" },
        {
          kind: "guide",
          title: "안내: 문서",
          path: "/guide?doc=user-guide%2Fdocs",
        },
      ])
    );
  });

  test("학생에게 /forms 와 수업 개설을 주지 않는다", () => {
    const links = buildAlterGuideLinks(
      [
        { key: "admin-guide/form-management.md" },
        { key: "user-guide/courses.md" },
      ],
      {
        user: { auth: "member" },
        school: {},
        registration: { role: "student" },
        message: "수업 개설은 어떻게 하나요",
      }
    );
    expect(links.some((l) => l.path === "/forms")).toBe(false);
    expect(links.some((l) => l.path === "/courses/design")).toBe(false);
    expect(links.some((l) => l.path === "/guide?doc=user-guide%2Fcourses")).toBe(
      true
    );
  });

  test("학기 등록이 없으면 /docs 화면 링크를 빼다", () => {
    const links = buildAlterGuideLinks([{ key: "user-guide/docs.md" }], {
      user: { auth: "member" },
      school: {},
      registration: null,
    });
    expect(links.some((l) => l.kind === "page" && l.path === "/docs")).toBe(
      false
    );
    expect(links.some((l) => l.kind === "guide")).toBe(true);
  });

  test("학생 기록 화면은 /myArchive", () => {
    const links = buildAlterGuideLinks([{ key: "user-guide/archive.md" }], {
      user: { auth: "member" },
      school: {},
      registration: { role: "student" },
    });
    expect(links.some((l) => l.path === "/myArchive")).toBe(true);
    expect(links.some((l) => l.path === "/archive")).toBe(false);
  });
});

describe("normalizeAlterGuideLinks", () => {
  test("외부 URL과 중복을 제거한다", () => {
    const out = normalizeAlterGuideLinks([
      { kind: "page", title: "문서", path: "/docs" },
      { kind: "page", title: "문서", path: "/docs" },
      { kind: "guide", title: "악성", path: "https://evil.example" },
    ]);
    expect(out).toEqual([{ kind: "page", title: "문서", path: "/docs" }]);
  });
});
