import { applyFormResponseByField } from "./formResponseDraft";
import { redactImagesForPreview } from "./formResponseSlots";

describe("applyFormResponseByField", () => {
  it("applies docResponse verbatim without re-merge and skips unchanged", () => {
    const template =
      "![logo](data:image/png;base64,AAA)\n| 수신 |\n\n(본문 작성)\n";
    const filled =
      "![logo](data:image/png;base64,AAA)\n| 수신 |\n\n본문입니다.\n";
    const current: Record<string, unknown> = {
      doc1: template,
      title1: "이전 제목",
    };
    const setCalls: Array<[string, unknown]> = [];
    const result = applyFormResponseByField({
      byField: {
        doc1: filled,
        title1: "이전 제목",
      },
      fields: [
        { fieldId: "doc1", type: "docResponse", label: "기안문", template },
        { fieldId: "title1", type: "text", label: "제목" },
      ],
      current,
      setValue: (id, v) => {
        setCalls.push([id, v]);
        current[id] = v;
      },
    });

    expect(result.applied).toBe(1);
    expect(result.skipped).toBe(1);
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0][0]).toBe("doc1");
    expect(String(setCalls[0][1])).toContain("본문입니다.");
    expect(String(setCalls[0][1])).toContain("data:image/png;base64,AAA");
    expect(current.doc1).toBe(setCalls[0][1]);
  });

  it("skips when draft equals current editor value", () => {
    const same = "이미 같은 본문";
    const current: Record<string, unknown> = { doc1: same };
    const result = applyFormResponseByField({
      byField: { doc1: same },
      fields: [{ fieldId: "doc1", type: "docResponse", label: "기안문" }],
      current,
      setValue: () => {
        throw new Error("should not set");
      },
    });
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it("does not apply truncated/broken data-URI dump over template", () => {
    const logo = "A".repeat(8000);
    const template = `![logo](data:image/png;base64,${logo})
| 수신 | 경유 |
| :--- | :--- |
| 교장 | 교감 |

(본문 작성)
`;
    const garbage = `![] (data:image/png;base64,${"B".repeat(500)})…`;
    const current: Record<string, unknown> = { doc1: template };
    const result = applyFormResponseByField({
      byField: { doc1: garbage },
      fields: [
        { fieldId: "doc1", type: "docResponse", label: "기안문", template },
      ],
      current,
      setValue: () => {
        throw new Error("must not apply image dump");
      },
    });
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(1);
    expect(current.doc1).toBe(template);
  });

  it("preview redacts data URIs while apply still gets full merged doc", () => {
    const filled =
      "![logo](data:image/png;base64,AAA)\n| 수신 |\n\n본문입니다.\n";
    expect(redactImagesForPreview(filled)).toContain("[이미지]");
    expect(redactImagesForPreview(filled)).toContain("본문입니다.");
    expect(redactImagesForPreview(filled)).not.toContain("base64");
    const htmlImg =
      "<p>본문입니다.</p><img src=\"data:image/png;base64,AAAABBBB\" />";
    expect(redactImagesForPreview(htmlImg)).toContain("[이미지]");
    expect(redactImagesForPreview(htmlImg)).toContain("본문입니다.");
    expect(redactImagesForPreview(htmlImg)).not.toContain("base64");

    const current: Record<string, unknown> = {
      doc1: "![logo](data:image/png;base64,AAA)\n| 수신 |\n\n(본문 작성)\n",
    };
    applyFormResponseByField({
      byField: { doc1: filled },
      fields: [{ fieldId: "doc1", type: "docResponse", label: "기안문" }],
      current,
      setValue: (id, v) => {
        current[id] = v;
      },
    });
    expect(String(current.doc1)).toContain("data:image/png;base64,AAA");
    expect(String(current.doc1)).toContain("본문입니다.");
  });
});
