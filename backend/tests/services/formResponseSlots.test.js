import {
  extractDocResponseSlots,
  fillDocResponseSlotsInOrder,
  isAcceptableMergedDocResponse,
  isBrokenDocResponseImageDump,
  mergeDocResponseTemplate,
  parseDocResponseSlotFills,
  preservesDocResponseSkeleton,
  redactImagesForPrompt,
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

  it("extracts standard and legacy slots in order", () => {
    const md = "A (작성) B (본문 작성) C (이곳에 입력하세요.) D";
    const slots = extractDocResponseSlots(md);
    expect(slots.map((s) => s.raw)).toEqual([
      "(작성)",
      "(본문 작성)",
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

  it("keeps AI output when skeleton is preserved", () => {
    const filled = template
      .replace("(작성)", "구입 계획")
      .replace("(본문 작성)", "본문")
      .replace("(금액 작성)", "1원");
    expect(preservesDocResponseSkeleton(template, filled)).toBe(true);
    expect(mergeDocResponseTemplate(template, filled).trim()).toBe(
      filled.trim()
    );
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
