import { GUIDE_DOCS } from "../../src/data/guideDocs.generated.js";
import {
  guideKeysForAuth,
  retrieveAlterGuide,
  titleFromGuideMarkdown,
} from "../../src/services/alterGuideRetrieve.js";

describe("guideKeysForAuth", () => {
  test("교사·학생은 user-guide와 INDEX만", () => {
    const keys = guideKeysForAuth("member");
    expect(keys).toContain("INDEX.md");
    expect(keys).toContain("user-guide/docs.md");
    expect(keys.some((k) => k.startsWith("admin-guide/"))).toBe(false);
    expect(keys.some((k) => k.startsWith("getting-started/"))).toBe(false);
  });

  test("관리자는 admin-guide를 포함하고 API 문서는 없다", () => {
    const keys = guideKeysForAuth("manager");
    expect(keys).toContain("admin-guide/form-management.md");
    expect(keys.some((k) => k.startsWith("api-reference/"))).toBe(false);
  });
});

describe("retrieveAlterGuide", () => {
  test("문서 미리보기 질문은 docs 안내를 찾는다", () => {
    const hits = retrieveAlterGuide({
      query: "문서 미리보기 어떻게 하나요",
      auth: "teacher",
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.key === "user-guide/docs.md")).toBe(true);
  });

  test("API 레퍼런스 키는 결과에 없다", () => {
    const hits = retrieveAlterGuide({
      query: "보드 API",
      auth: "owner",
    });
    expect(hits.every((h) => !String(h.key).startsWith("api-reference/"))).toBe(
      true
    );
  });
});

describe("titleFromGuideMarkdown", () => {
  test("첫 제목에서 장식 문자를 뺀다", () => {
    expect(titleFromGuideMarkdown(GUIDE_DOCS["user-guide/docs.md"])).toBe(
      "문서"
    );
  });
});
