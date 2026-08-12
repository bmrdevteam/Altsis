import {
  getSiteExt,
  isSiteTextEditable,
  joinSitePath,
} from "./sitePaths";

describe("sitePaths", () => {
  test("joinSitePath", () => {
    expect(joinSitePath("", "index.html")).toBe("index.html");
    expect(joinSitePath("css", "style.css")).toBe("css/style.css");
    expect(joinSitePath("a/", "b.js")).toBe("a/b.js");
  });

  test("getSiteExt / isSiteTextEditable", () => {
    expect(getSiteExt("a/b.HTML")).toBe("html");
    expect(isSiteTextEditable("page.html")).toBe(true);
    expect(isSiteTextEditable("img.png")).toBe(false);
  });
});
