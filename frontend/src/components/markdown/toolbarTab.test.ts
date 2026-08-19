import {
  activeToolbarPanel,
  detectEditorContext,
  resolveToolbarTab,
} from "./toolbarTab";

describe("detectEditorContext", () => {
  test("prefers image over table", () => {
    expect(detectEditorContext({ isImage: true, isTable: true })).toBe(
      "image"
    );
    expect(detectEditorContext({ isImage: true, isTable: false })).toBe(
      "image"
    );
  });

  test("detects table and none", () => {
    expect(detectEditorContext({ isImage: false, isTable: true })).toBe(
      "table"
    );
    expect(detectEditorContext({ isImage: false, isTable: false })).toBe(
      "none"
    );
  });
});

describe("resolveToolbarTab", () => {
  test("auto-switches when entering table or image", () => {
    expect(
      resolveToolbarTab({
        context: "table",
        previousContext: "none",
        tab: "format",
      })
    ).toBe("table");
    expect(
      resolveToolbarTab({
        context: "image",
        previousContext: "none",
        tab: "format",
      })
    ).toBe("image");
  });

  test("keeps 서식 while still in the same table", () => {
    expect(
      resolveToolbarTab({
        context: "table",
        previousContext: "table",
        tab: "format",
      })
    ).toBe("format");
  });

  test("returns to 서식 when leaving the context", () => {
    expect(
      resolveToolbarTab({
        context: "none",
        previousContext: "table",
        tab: "table",
      })
    ).toBe("format");
  });

  test("switches when moving from table to image", () => {
    expect(
      resolveToolbarTab({
        context: "image",
        previousContext: "table",
        tab: "table",
      })
    ).toBe("image");
  });
});

describe("activeToolbarPanel", () => {
  test("shows format outside wysiwyg or when 서식 is selected", () => {
    expect(
      activeToolbarPanel({
        viewMode: "split",
        context: "table",
        tab: "table",
      })
    ).toBe("format");
    expect(
      activeToolbarPanel({
        viewMode: "wysiwyg",
        context: "table",
        tab: "format",
      })
    ).toBe("format");
  });

  test("shows table or image tools only with matching context", () => {
    expect(
      activeToolbarPanel({
        viewMode: "wysiwyg",
        context: "table",
        tab: "table",
      })
    ).toBe("table");
    expect(
      activeToolbarPanel({
        viewMode: "wysiwyg",
        context: "image",
        tab: "image",
      })
    ).toBe("image");
    expect(
      activeToolbarPanel({
        viewMode: "wysiwyg",
        context: "none",
        tab: "table",
      })
    ).toBe("format");
  });
});
