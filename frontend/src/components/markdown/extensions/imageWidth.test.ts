import {
  parseImageWidth,
  serializeResizableImage,
  shouldSerializeImageAsHtml,
  widthFromImgProps,
} from "./imageWidth";

describe("parseImageWidth", () => {
  test("normalizes px and bare numbers", () => {
    expect(parseImageWidth("180px")).toBe("180px");
    expect(parseImageWidth("180")).toBe("180px");
    expect(parseImageWidth(180)).toBe("180px");
    expect(parseImageWidth("180.7px")).toBe("181px");
  });

  test("rejects empty or invalid values", () => {
    expect(parseImageWidth("")).toBeNull();
    expect(parseImageWidth(null)).toBeNull();
    expect(parseImageWidth(0)).toBeNull();
    expect(parseImageWidth("auto")).toBeNull();
  });
});

describe("shouldSerializeImageAsHtml", () => {
  test("uses HTML when width is set even if left-aligned and no caption", () => {
    expect(
      shouldSerializeImageAsHtml({
        caption: "",
        align: "left",
        width: "180px",
      })
    ).toBe(true);
  });

  test("keeps plain markdown for default images", () => {
    expect(
      shouldSerializeImageAsHtml({
        caption: "",
        align: "left",
        width: null,
      })
    ).toBe(false);
  });
});

describe("serializeResizableImage", () => {
  test("writes style width for a resized default image", () => {
    expect(
      serializeResizableImage({
        src: "https://ex.test/logo.png",
        alt: "로고",
        width: "180px",
      })
    ).toBe(
      '<img src="https://ex.test/logo.png" alt="로고" width="180" data-align="left" style="width:180px;max-width:100%;height:auto" />'
    );
  });

  test("keeps markdown when size was not set", () => {
    expect(
      serializeResizableImage({
        src: "https://ex.test/logo.png",
        alt: "로고",
      })
    ).toBe("![로고](https://ex.test/logo.png)");
  });

  test("keeps figure when caption or align needs HTML", () => {
    const html = serializeResizableImage({
      src: "https://ex.test/a.png",
      alt: "a",
      caption: "설명",
      align: "center",
      width: 120,
    });
    expect(html).toContain("<figure data-align=\"center\"");
    expect(html).toContain("width:120px");
    expect(html).toContain("<figcaption>설명</figcaption>");
  });
});

describe("widthFromImgProps", () => {
  test("reads style object and width attribute", () => {
    expect(widthFromImgProps({ style: { width: "160px" } })).toBe("160px");
    expect(widthFromImgProps({ width: "90" })).toBe("90px");
    expect(
      widthFromImgProps({ style: "max-width:100%;width:140px;height:auto" })
    ).toBe("140px");
  });
});
