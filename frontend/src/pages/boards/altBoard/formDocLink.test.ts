import {
  fileAnswerLabel,
  isFileAnswerFile,
  isFileAnswerLink,
  linkDisplayTitle,
  linkPreviewHostname,
  mergeOgIntoLink,
  sanitizeHttpUrl,
} from "./formDocLink";

describe("sanitizeHttpUrl", () => {
  test("accepts http and https", () => {
    expect(sanitizeHttpUrl("https://example.com/a")).toBe(
      "https://example.com/a"
    );
    expect(sanitizeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  test("rejects javascript and empty", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeHttpUrl("")).toBeNull();
    expect(sanitizeHttpUrl("  ")).toBeNull();
    expect(sanitizeHttpUrl("not-a-url")).toBeNull();
  });
});

describe("linkDisplayTitle", () => {
  test("falls back to og title then url", () => {
    expect(linkDisplayTitle({ url: "https://a.example" })).toBe(
      "https://a.example"
    );
    expect(
      linkDisplayTitle({
        ogTitle: "OG 제목",
        url: "https://a.example",
      })
    ).toBe("OG 제목");
    expect(linkDisplayTitle({ title: " 안내 ", url: "https://a.example" })).toBe(
      "안내"
    );
  });
});

describe("mergeOgIntoLink", () => {
  test("keeps a user title and fills OG fields", () => {
    const next = mergeOgIntoLink(
      { title: "내 제목", url: "https://example.com/a" },
      {
        ogTitle: "사이트 제목",
        ogDescription: "설명",
        ogImage: "https://cdn.example.com/og.png",
      }
    );
    expect(next.title).toBe("내 제목");
    expect(next.ogTitle).toBe("사이트 제목");
    expect(next.ogDescription).toBe("설명");
    expect(next.ogImage).toBe("https://cdn.example.com/og.png");
  });

  test("uses a YouTube thumbnail when OG has no image", () => {
    const next = mergeOgIntoLink(
      { url: "https://www.youtube.com/watch?v=in3QLvtgyps" },
      {}
    );
    expect(next.ogImage).toBe(
      "https://img.youtube.com/vi/in3QLvtgyps/mqdefault.jpg"
    );
  });

  test("rejects javascript ogImage", () => {
    const next = mergeOgIntoLink(
      { url: "https://example.com" },
      { ogImage: "javascript:alert(1)" }
    );
    expect(next.ogImage).toBeUndefined();
  });
});

describe("linkPreviewHostname", () => {
  test("returns hostname", () => {
    expect(linkPreviewHostname("https://www.youtube.com/watch?v=a")).toBe(
      "www.youtube.com"
    );
  });
});

describe("file answer items", () => {
  test("distinguishes file vs link", () => {
    expect(isFileAnswerFile({ key: "forms/a", originalName: "a.pdf" })).toBe(
      true
    );
    expect(isFileAnswerLink({ key: "forms/a", originalName: "a.pdf" })).toBe(
      false
    );
    expect(isFileAnswerLink({ url: "https://example.com" })).toBe(true);
    expect(isFileAnswerFile({ url: "https://example.com" })).toBe(false);
  });

  test("labels files and links", () => {
    expect(fileAnswerLabel({ key: "k", originalName: "a.pdf" })).toBe("a.pdf");
    expect(
      fileAnswerLabel({ title: "안내", url: "https://example.com" })
    ).toBe("안내");
    expect(fileAnswerLabel({ url: "https://example.com" })).toBe(
      "https://example.com"
    );
  });
});
