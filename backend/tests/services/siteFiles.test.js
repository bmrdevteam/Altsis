import {
  normalizeSitePath,
  isAllowedFilePath,
  isTextEditablePath,
  resolvePublicRelativePath,
  toS3Key,
  assertKeyInSite,
  relativeFromKey,
  getExtension,
  contentTypeForPath,
} from "../../src/services/sitePath.js";

describe("normalizeSitePath", () => {
  test("accepts nested relative paths", () => {
    expect(normalizeSitePath("css/style.css")).toBe("css/style.css");
    expect(normalizeSitePath("/images/logo.png")).toBe("images/logo.png");
  });

  test("allows Hangul and spaces in segments", () => {
    expect(normalizeSitePath("소개/학교 안내.html")).toBe("소개/학교 안내.html");
  });

  test("rejects traversal and absolute escapes", () => {
    expect(normalizeSitePath("../secret")).toBeNull();
    expect(normalizeSitePath("a/../../b")).toBeNull();
    expect(normalizeSitePath("a\\..\\b")).toBeNull();
    expect(normalizeSitePath(".")).toBeNull();
  });

  test("allowEmpty returns empty string", () => {
    expect(normalizeSitePath("", { allowEmpty: true })).toBe("");
    expect(normalizeSitePath("/", { allowEmpty: true })).toBe("");
  });

  test("rejects unsafe characters", () => {
    expect(normalizeSitePath("a<script>.html")).toBeNull();
    expect(normalizeSitePath("foo|bar.html")).toBeNull();
  });
});

describe("file path rules", () => {
  test("whitelist extensions", () => {
    expect(isAllowedFilePath("index.html")).toBe(true);
    expect(isAllowedFilePath("app.js")).toBe(true);
    expect(isAllowedFilePath("note.exe")).toBe(false);
    expect(isAllowedFilePath("README")).toBe(false);
  });

  test("text editable set", () => {
    expect(isTextEditablePath("a.css")).toBe(true);
    expect(isTextEditablePath("a.png")).toBe(false);
  });

  test("content types", () => {
    expect(contentTypeForPath("x.html")).toContain("text/html");
    expect(getExtension("a/b.JS")).toBe("js");
  });
});

describe("public path resolution", () => {
  test("empty and trailing slash become index.html", () => {
    expect(resolvePublicRelativePath("")).toBe("index.html");
    expect(resolvePublicRelativePath("docs/")).toBe("docs/index.html");
  });

  test("keeps explicit file paths", () => {
    expect(resolvePublicRelativePath("about.html")).toBe("about.html");
  });

  test("rejects traversal in public path", () => {
    expect(resolvePublicRelativePath("../x.html")).toBeNull();
  });
});

describe("S3 key helpers", () => {
  test("builds and validates site keys", () => {
    expect(toS3Key("demo", "index.html")).toBe("demo/site/index.html");
    expect(assertKeyInSite("demo", "demo/site/css/a.css")).toBe(true);
    expect(assertKeyInSite("demo", "other/site/a.css")).toBe(false);
    expect(relativeFromKey("demo", "demo/site/css/a.css")).toBe("css/a.css");
  });
});
