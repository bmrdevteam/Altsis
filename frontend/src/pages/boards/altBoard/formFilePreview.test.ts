import {
  fileExtension,
  fileThumbTone,
  formatFileSize,
  getFilePreviewKind,
  inferMimeType,
} from "./formFilePreview";

describe("formFilePreview", () => {
  test("infers csv and html from extension when mime is missing", () => {
    expect(inferMimeType({ originalName: "a.csv", key: "k" })).toBe("text/csv");
    expect(inferMimeType({ originalName: "b.html", key: "k" })).toBe("text/html");
    expect(fileExtension("Report.HTML")).toBe("html");
  });

  test("classifies preview kinds", () => {
    expect(getFilePreviewKind({ originalName: "a.png", key: "k" })).toBe("image");
    expect(getFilePreviewKind({ originalName: "a.pdf", key: "k" })).toBe("pdf");
    expect(getFilePreviewKind({ originalName: "a.html", key: "k" })).toBe("html");
    expect(getFilePreviewKind({ originalName: "a.csv", key: "k" })).toBe(
      "download"
    );
    expect(getFilePreviewKind({ originalName: "a.txt", key: "k" })).toBe("text");
    expect(getFilePreviewKind({ originalName: "a.docx", key: "k" })).toBe(
      "download"
    );
  });

  test("formats file size", () => {
    expect(formatFileSize(undefined)).toBe("");
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  test("maps extensions to thumb tones", () => {
    expect(fileThumbTone({ originalName: "a.csv", key: "k" })).toBe("csv");
    expect(fileThumbTone({ originalName: "a.pdf", key: "k" })).toBe("pdf");
    expect(fileThumbTone({ originalName: "a.html", key: "k" })).toBe("html");
    expect(fileThumbTone({ originalName: "a.png", key: "k" })).toBe("image");
    expect(fileThumbTone({ originalName: "a.json", key: "k" })).toBe("json");
    expect(fileThumbTone({ originalName: "a.md", key: "k" })).toBe("text");
    expect(fileThumbTone({ originalName: "a.pptx", key: "k" })).toBe("office");
    expect(fileThumbTone({ originalName: "a.zip", key: "k" })).toBe("archive");
    expect(fileThumbTone({ originalName: "a.bin", key: "k" })).toBe("default");
  });
});
