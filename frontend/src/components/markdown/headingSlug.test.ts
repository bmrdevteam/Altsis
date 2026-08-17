import {
  createGithubSlugger,
  flattenHeadingText,
  githubHeadingSlug,
} from "./headingSlug";

describe("githubHeadingSlug", () => {
  test("matches documentation TOC anchors", () => {
    expect(githubHeadingSlug("개요")).toBe("개요");
    expect(githubHeadingSlug("채팅 유형")).toBe("채팅-유형");
    expect(githubHeadingSlug("DM (1:1 채팅)")).toBe("dm-11-채팅");
    expect(githubHeadingSlug("Alter (전역 AI 어시스턴트)")).toBe(
      "alter-전역-ai-어시스턴트"
    );
  });

  test("suffixes duplicate headings like GitHub", () => {
    const slug = createGithubSlugger();
    expect(slug("개요")).toBe("개요");
    expect(slug("개요")).toBe("개요-1");
  });

  test("flattens nested heading children", () => {
    expect(flattenHeadingText(["DM ", { props: { children: "(1:1 채팅)" } }])).toBe(
      "DM (1:1 채팅)"
    );
  });
});
