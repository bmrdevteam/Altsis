import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";

const frontendRoot = path.resolve(__dirname, "../../../..");

const renderGfm = (singleTilde: boolean) => {
  const script = `
    import { micromark } from "micromark";
    import { gfm, gfmHtml } from "micromark-extension-gfm";
    const text = "최고 17~19°C, 아침 14~17°C\\n\\n~~취소~~";
    const html = micromark(text, {
      extensions: [gfm({ singleTilde: ${singleTilde} })],
      htmlExtensions: [gfmHtml()],
    });
    process.stdout.write(html);
  `;
  return spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: frontendRoot,
    encoding: "utf8",
  });
};

describe("Alter assistant markdown", () => {
  test("Alter turns off single-tilde strikethrough", () => {
    const body = readFileSync(path.join(__dirname, "AlterAssistantBody.tsx"), "utf8");
    const viewer = readFileSync(
      path.join(frontendRoot, "src/components/markdown/MarkdownViewer.tsx"),
      "utf8"
    );
    expect(body).toContain("singleTilde={false}");
    expect(viewer).toContain("[remarkGfm, { singleTilde }]");
  });

  test("a temperature range keeps both tildes and a double tilde stays struck", () => {
    const kept = renderGfm(false);
    expect(kept.status).toBe(0);
    expect(kept.stdout).toContain("17~19°C");
    expect(kept.stdout).toContain("14~17°C");
    expect(kept.stdout).not.toContain("<del>19");
    expect(kept.stdout).toContain("<del>취소</del>");

    const struck = renderGfm(true);
    expect(struck.status).toBe(0);
    expect(struck.stdout).toContain("<del>");
    expect(struck.stdout).not.toContain("17~19°C");
  });
});
