import { redactImagesForPreview } from "utils/formResponseSlots";
import { sourceToggleLabel } from "./draftUi";
import {
  buildSearchCsv,
  fieldTypeLabel,
  firstHeadingFromContent,
  formatDraftFieldText,
  formParserType,
  hasInteractiveFence,
  looksLikeDocumentHtml,
  looksLikeRichDraftText,
  looksLikeUuid,
  previewFieldLabel,
  stringifyDraftValue,
} from "./draftPreview";

describe("draftPreview helpers", () => {
  test("looksLikeDocumentHtml detects tables and styled blocks", () => {
    expect(looksLikeDocumentHtml("안녕")).toBe(false);
    expect(looksLikeDocumentHtml("<table><tr><td>a</td></tr></table>")).toBe(
      true
    );
    expect(
      looksLikeDocumentHtml('<div style="color:red">본문</div>')
    ).toBe(true);
    expect(looksLikeDocumentHtml("<p>a</p><p>b</p><p>c</p>")).toBe(true);
    expect(looksLikeDocumentHtml("click </a> here")).toBe(false);
  });

  test("hasInteractiveFence", () => {
    expect(hasInteractiveFence("```html-app\n<div/>\n```")).toBe(true);
    expect(hasInteractiveFence("```canvas:400\n{}\n```")).toBe(true);
    expect(hasInteractiveFence("일반 답변")).toBe(false);
  });

  test("looksLikeUuid and previewFieldLabel", () => {
    const id = "3e17a857-8c2a-4233-aa94-b4704c02e6df";
    expect(looksLikeUuid(id)).toBe(true);
    expect(looksLikeUuid("제목")).toBe(false);
    expect(previewFieldLabel(id, "짧은 값", { label: id, type: "text" })).toBe(
      "짧은 값"
    );
    expect(previewFieldLabel(id, "", { label: id, type: "text" })).toBe(
      "단답형"
    );
    expect(
      previewFieldLabel(id, "# 체육대회 계획\n본문", {
        label: id,
        type: "docResponse",
      })
    ).toBe("체육대회 계획");
    expect(
      previewFieldLabel("title1", "x", { label: "제목", type: "text" })
    ).toBe("제목");
  });

  test("firstHeadingFromContent and fieldTypeLabel", () => {
    expect(firstHeadingFromContent("# 개최 계획\n본문")).toBe("개최 계획");
    expect(firstHeadingFromContent("<h2>안내</h2><p>본문</p>")).toBe("안내");
    expect(fieldTypeLabel("docResponse")).toBe("응답 문서");
    expect(formParserType("timetable")).toBe("timetable");
    expect(formParserType("print")).toBe("syllabus");
  });

  test("looksLikeRichDraftText", () => {
    expect(looksLikeRichDraftText("짧음")).toBe(false);
    expect(looksLikeRichDraftText("| a | b |\n| --- | --- |")).toBe(true);
    expect(looksLikeRichDraftText("x".repeat(241))).toBe(true);
  });

  test("sourceToggleLabel", () => {
    expect(sourceToggleLabel(false)).toBe("원문 보기");
    expect(sourceToggleLabel(true)).toBe("원문 접기");
  });

  test("formatDraftFieldText renders approval steps, not JSON", () => {
    const value = {
      version: 2,
      currentStep: 0,
      overallStatus: "pending",
      status: "pending",
      steps: [
        {
          order: 0,
          label: "담당",
          mode: "pick",
          approver: {
            user: "u1",
            userId: "mrgoodway",
            userName: "조은길",
          },
        },
        {
          order: 1,
          label: "팀장",
          mode: "pick",
          approver: { user: "u2", userId: "lead1", userName: "이팀장" },
        },
        {
          order: 2,
          label: "학교장",
          mode: "pick",
          approver: { userId: "principal" },
        },
      ],
    };
    expect(formatDraftFieldText(value, { type: "approval" })).toBe(
      "담당 · 조은길\n팀장 · 이팀장\n학교장 · principal"
    );
    expect(formatDraftFieldText(value)).toBe(
      "담당 · 조은길\n팀장 · 이팀장\n학교장 · principal"
    );
    expect(stringifyDraftValue(value)).toContain('"version": 2');
  });

  test("formatDraftFieldText shows skipped empty approval as 결재 생략", () => {
    expect(
      formatDraftFieldText(
        {
          version: 2,
          currentStep: 0,
          overallStatus: "approved",
          status: "approved",
          steps: [],
        },
        { type: "approval" }
      )
    ).toBe("결재 생략");
  });

  test("formatDraftFieldText keeps plain and userSelect text", () => {
    expect(formatDraftFieldText("본문입니다", { type: "text" })).toBe(
      "본문입니다"
    );
    expect(
      formatDraftFieldText(
        { user: "u1", userId: "mrgoodway", userName: "조은길" },
        { type: "userSelect" }
      )
    ).toBe("조은길");
    expect(
      formatDraftFieldText(
        [
          { userName: "조은길", userId: "a" },
          { userName: "이팀장", userId: "b" },
        ],
        { type: "userSelect" }
      )
    ).toBe("조은길, 이팀장");
  });

  test("buildSearchCsv uses column keys", () => {
    expect(
      buildSearchCsv({
        kind: "search",
        columns: [{ key: "name", label: "이름" }],
        rows: [{ name: "김" }],
      })
    ).toBe("name\n김");
  });
});

describe("redactImagesForPreview html", () => {
  test("redacts html data-uri images", () => {
    const html =
      "<p>본문</p><img src=\"data:image/png;base64,AAAA\" alt=\"x\" />";
    const out = redactImagesForPreview(html);
    expect(out).toContain("본문");
    expect(out).toContain("[이미지]");
    expect(out).not.toContain("base64");
  });

  test("redacts very long http image urls", () => {
    const url = `https://example.com/${"a".repeat(200)}.png`;
    const out = redactImagesForPreview(`<img src='${url}'>`);
    expect(out).toBe("[이미지]");
  });
});
