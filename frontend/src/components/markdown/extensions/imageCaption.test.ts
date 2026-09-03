import {
  IMAGE_CAPTION_PLACEHOLDER,
  hasImageCaption,
  imageCaptionPlaceholder,
  shouldRenderImageCaption,
} from "./imageCaption";

describe("hasImageCaption", () => {
  test("treats blank as no caption", () => {
    expect(hasImageCaption("")).toBe(false);
    expect(hasImageCaption("   ")).toBe(false);
    expect(hasImageCaption(null)).toBe(false);
    expect(hasImageCaption(undefined)).toBe(false);
  });

  test("keeps real caption text", () => {
    expect(hasImageCaption("로고")).toBe(true);
  });

  test("treats the editor placeholder as no caption", () => {
    expect(hasImageCaption(IMAGE_CAPTION_PLACEHOLDER)).toBe(false);
  });
});

describe("shouldRenderImageCaption", () => {
  test("always shows the field while editing", () => {
    expect(shouldRenderImageCaption(true, "")).toBe(true);
    expect(shouldRenderImageCaption(true, "로고")).toBe(true);
  });

  test("hides empty captions in view mode", () => {
    expect(shouldRenderImageCaption(false, "")).toBe(false);
    expect(shouldRenderImageCaption(false, "   ")).toBe(false);
  });

  test("shows written captions in view mode", () => {
    expect(shouldRenderImageCaption(false, "별무리학교")).toBe(true);
  });
});

describe("imageCaptionPlaceholder", () => {
  test("is only for empty captions while editing", () => {
    expect(imageCaptionPlaceholder(true, "")).toBe(IMAGE_CAPTION_PLACEHOLDER);
    expect(imageCaptionPlaceholder(true, "로고")).toBeUndefined();
    expect(imageCaptionPlaceholder(false, "")).toBeUndefined();
    expect(imageCaptionPlaceholder(false, "로고")).toBeUndefined();
  });
});
