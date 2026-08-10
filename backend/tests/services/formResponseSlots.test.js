import {
  extractDocResponseSlots,
  fillDocResponseSlotsInOrder,
  inferDocResponseSlots,
  isAcceptableMergedDocResponse,
  isBrokenDocResponseImageDump,
  looksLikeFullDocRewrite,
  mergeDocResponseTemplate,
  parseDocResponseSlotFills,
  preservesDocResponseSkeleton,
  redactImagesForPrompt,
  resolveDocResponseSlots,
  sanitizeAiDocResponseFill,
} from "../../src/services/formResponseSlots.js";
import { truncateText } from "../../src/services/aiPromptPolicy.js";

describe("formResponseSlots", () => {
  const template = `# 기안

![logo](https://example.com/a.png)

| 수신 | 경유 |
| :--- | :--- |
| 교장 | 교감 |

제목: (작성)

(본문 작성)

금액: (금액 작성)
`;

  it("extracts standard, idiom, and legacy slots in order", () => {
    const md = "A (작성) B (본문 작성) C (기입) D (이곳에 입력하세요.) E";
    const slots = extractDocResponseSlots(md);
    expect(slots.map((s) => s.raw)).toEqual([
      "(작성)",
      "(본문 작성)",
      "(기입)",
      "(이곳에 입력하세요.)",
    ]);
  });

  it("fills slots in order", () => {
    const out = fillDocResponseSlotsInOrder("제목:(작성)\n(본문 작성)", [
      "구입 계획",
      "다음과 같이 보고합니다.",
    ]);
    expect(out).toBe("제목:구입 계획\n다음과 같이 보고합니다.");
  });

  it("merges SLOT markers into template skeleton", () => {
    const ai = `<<<SLOT (작성)>>>
교재 구입 계획
<<<END_SLOT>>>
<<<SLOT (본문 작성)>>>
본문입니다.
<<<END_SLOT>>>
<<<SLOT (금액 작성)>>>
243,000원
<<<END_SLOT>>>`;
    const out = mergeDocResponseTemplate(template, ai);
    expect(out).toContain("![logo](https://example.com/a.png)");
    expect(out).toContain("| 수신 | 경유 |");
    expect(out).toContain("교재 구입 계획");
    expect(out).toContain("본문입니다.");
    expect(out).toContain("243,000원");
    expect(out).not.toContain("(작성)");
    expect(out).not.toContain("(본문 작성)");
  });

  it("when AI rewrites from scratch, keeps skeleton and fills body slot", () => {
    const ai =
      "2026학년도 교재 구입 계획을 다음과 같이 보고합니다.\n\n1. 관련\n2. 목적";
    const out = mergeDocResponseTemplate(template, ai);
    expect(out).toContain("![logo](https://example.com/a.png)");
    expect(out).toContain("| 수신 | 경유 |");
    expect(out).toContain(ai);
    expect(out).toContain("제목: (작성)"); // 제목 슬롯은 유지
    expect(out).toContain("금액: (금액 작성)");
    expect(out).not.toContain("(본문 작성)");
  });

  it("rejects full-document rewrite without SLOT markers (keeps base)", () => {
    const filled = template
      .replace("(작성)", "구입 계획")
      .replace("(본문 작성)", "본문")
      .replace("(금액 작성)", "1원");
    expect(preservesDocResponseSkeleton(template, filled)).toBe(true);
    expect(looksLikeFullDocRewrite(filled)).toBe(true);
    expect(mergeDocResponseTemplate(template, filled).trim()).toBe(
      template.trim()
    );
  });

  it("infers empty table cells and label blanks when no explicit slots", () => {
    const md = `| 수신 | 제목 |
| :--- | :--- |
| 교장 |  |

제목:

본문 ____
`;
    const inferred = inferDocResponseSlots(md);
    expect(inferred.length).toBeGreaterThanOrEqual(2);
    expect(inferred.some((s) => s.label === "제목")).toBe(true);
    expect(inferred.some((s) => /본문/.test(s.label))).toBe(true);
    // 빈 표 셀(제목 열)도 추론
    expect(
      inferred.some((s) => s.label === "교장" || s.label === "제목")
    ).toBe(true);
    expect(resolveDocResponseSlots(md).length).toBe(inferred.length);

    const ai = `<<<SLOT 제목>>>
교재 구입
<<<END_SLOT>>>
<<<SLOT 본문>>>
보고합니다.
<<<END_SLOT>>>`;
    const out = mergeDocResponseTemplate(md, ai);
    expect(out).toContain("| 수신 | 제목 |");
    expect(out).toContain("교장");
    expect(out).toContain("교재 구입");
    expect(out).toContain("보고합니다.");
    expect(out).not.toContain("____");
  });

  it("ignores inference when explicit (작성) slots exist", () => {
    const md = `| 수신 | 제목 |
| :--- | :--- |
| 교장 |  |

제목: (작성)
`;
    const explicit = extractDocResponseSlots(md);
    expect(explicit.map((s) => s.raw)).toEqual(["(작성)"]);
    expect(resolveDocResponseSlots(md)).toEqual(explicit);
  });

  it("infers empty HTML table cells (TipTap draft) and fills via SLOT", () => {
    const html = `<table>
<tr><td>수신</td><td>내부결재</td><td>경유</td><td><p><br></p></td></tr>
<tr><td>제목</td><td colspan="3"></td></tr>
<tr><td>담당자</td><td>&nbsp;</td><td>협조자</td><td>교육지원실장</td></tr>
</table>
<p>본문</p>`;
    const inferred = inferDocResponseSlots(html);
    expect(inferred.length).toBeGreaterThanOrEqual(2);
    expect(inferred.some((s) => s.label === "경유")).toBe(true);
    expect(inferred.some((s) => s.label === "제목")).toBe(true);
    expect(inferred.some((s) => s.label === "담당자")).toBe(true);

    const ai = `<<<SLOT 경유>>>
행정실
<<<END_SLOT>>>
<<<SLOT 제목>>>
물품 구입 기안
<<<END_SLOT>>>
<<<SLOT 담당자>>>
조은길
<<<END_SLOT>>>`;
    const out = mergeDocResponseTemplate(html, ai);
    expect(out).toContain("<table>");
    expect(out).toContain("내부결재");
    expect(out).toContain("행정실");
    expect(out).toContain("물품 구입 기안");
    expect(out).toContain("조은길");
    expect(out).toContain("교육지원실장");
    // 전체 HTML 재작성은 거부
    const rewrite = `<table><tr><td>수신</td><td>새값</td></tr></table>`;
    expect(mergeDocResponseTemplate(html, rewrite).trim()).toBe(html.trim());
  });

  it("parses slot fill blocks", () => {
    const fills = parseDocResponseSlotFills(`<<<SLOT (금액 작성)>>>
10,000
<<<END_SLOT>>>`);
    expect(fills).toEqual([{ key: "(금액 작성)", value: "10,000" }]);
  });

  it("redacts data-uri images for prompt", () => {
    const md = "A ![a](data:image/png;base64,AAAA) B";
    expect(redactImagesForPrompt(md)).toBe("A ![a](<<KEEP_IMAGE_1>>) B");
  });

  it("strips broken data-uri dump from AI fill", () => {
    const dump = `본문\n![] (data:image/png;base64,${"A".repeat(300)})\n끝`;
    const cleaned = sanitizeAiDocResponseFill(dump);
    expect(cleaned).toContain("본문");
    expect(cleaned).toContain("끝");
    expect(cleaned).not.toMatch(/data:image/);
  });

  it("keeps template when AI only returns base64 image dump", () => {
    const base = `![logo](data:image/png;base64,LOGOdata)\n| 수신 |\n| --- |\n\n(본문 작성)\n`;
    const ai = `![] (data:image/png;base64,${"B".repeat(400)})`;
    const out = mergeDocResponseTemplate(base, ai);
    expect(out).toContain("![logo](data:image/png;base64,LOGOdata)");
    expect(out).toContain("(본문 작성)");
    expect(out).not.toMatch(/BBBB/);
    // byField 제외 조건: merge 결과가 base와 동일
    expect(out.trim()).toBe(base.trim());
  });

  it("rejects truncated logo dump as unacceptable merge (byField must omit)", () => {
    const logo = "A".repeat(20000);
    const base = `![logo](data:image/png;base64,${logo})
| 수신 | 경유 |
| :--- | :--- |
| 교장 | 교감 |

(본문 작성)
`;
    const aiDump = `![] (data:image/png;base64,${"B".repeat(400)})`;
    const merged = mergeDocResponseTemplate(base, aiDump);
    expect(merged.trim()).toBe(base.trim());

    // 과거 버그: merge===base 인데 truncate 하면 로고만 남은 쓰레기 ≠ base → byField 진입
    const wronglyTruncated = truncateText(merged, 14000);
    expect(wronglyTruncated.trim()).not.toBe(base.trim());
    expect(isAcceptableMergedDocResponse(base, wronglyTruncated)).toBe(false);

    const filled = mergeDocResponseTemplate(
      base,
      `<<<SLOT (본문 작성)>>>\n보고합니다.\n<<<END_SLOT>>>`
    );
    expect(filled).toContain("보고합니다.");
    expect(filled).toContain("| 수신 | 경유 |");
    expect(filled.length).toBeGreaterThan(14000);
    expect(isAcceptableMergedDocResponse(base, filled)).toBe(true);
    // 병합본은 truncate 하지 않아야 한다
    expect(isAcceptableMergedDocResponse(base, truncateText(filled, 14000))).toBe(
      false
    );
  });

  it("SLOT image-dump fill does not overwrite template", () => {
    const base = `![logo](data:image/png;base64,LOGO)\n| 수신 |\n| --- |\n\n(본문 작성)\n`;
    const ai = `<<<SLOT (본문 작성)>>>
![] (data:image/png;base64,${"C".repeat(300)})
<<<END_SLOT>>>`;
    const out = mergeDocResponseTemplate(base, ai);
    expect(out.trim()).toBe(base.trim());
    expect(isBrokenDocResponseImageDump(ai)).toBe(true);
  });

  it("marks filled slots as changed from base", () => {
    const base = "제목:(작성)\n\n(본문 작성)\n";
    const ai = `<<<SLOT (작성)>>>
구입 계획
<<<END_SLOT>>>
<<<SLOT (본문 작성)>>>
보고합니다.
<<<END_SLOT>>>`;
    const out = mergeDocResponseTemplate(base, ai);
    expect(out.trim()).not.toBe(base.trim());
    expect(out).toContain("구입 계획");
    expect(out).toContain("보고합니다.");
  });
});
