import {
  processAlterUpload,
  resolveAlterMime,
  attachmentsToSourceText,
} from "../../src/services/alterAttachments.js";

describe("alterAttachments", () => {
  test("resolveAlterMime prefers extension", () => {
    expect(resolveAlterMime("application/octet-stream", "note.md")).toBe(
      "text/markdown"
    );
    expect(resolveAlterMime("application/octet-stream", "a.pdf")).toBe(
      "application/pdf"
    );
    expect(resolveAlterMime("image/png", "x.png")).toBe("image/png");
  });

  test("processAlterUpload extracts plain text", async () => {
    const result = await processAlterUpload({
      buffer: Buffer.from("hello alter", "utf8"),
      mimeType: "text/plain",
      originalName: "a.txt",
      fileKey: "acad/alter/s/a.txt",
      fileSize: 11,
    });
    expect(result.kind).toBe("text");
    expect(result.text).toContain("hello alter");
    expect(result.key).toBe("acad/alter/s/a.txt");
  });

  test("processAlterUpload keeps image as key", async () => {
    const result = await processAlterUpload({
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      mimeType: "image/png",
      originalName: "pic.png",
      fileKey: "acad/alter/s/pic.png",
      fileSize: 4,
    });
    expect(result).toMatchObject({
      kind: "image",
      mimeType: "image/png",
      key: "acad/alter/s/pic.png",
      name: "pic.png",
    });
  });

  test("processAlterUpload rejects empty text", async () => {
    await expect(
      processAlterUpload({
        buffer: Buffer.from("   \n\t  ", "utf8"),
        mimeType: "text/plain",
        originalName: "empty.txt",
        fileKey: "acad/alter/s/empty.txt",
        fileSize: 6,
      })
    ).rejects.toMatchObject({ code: "EMPTY_TEXT" });
  });

  test("processAlterUpload rejects short PDF extract as scan", async () => {
    const extractor = await import("../../src/utils/textExtractor.js");
    const spy = jest.spyOn(extractor, "extractText").mockResolvedValue("짧음");
    try {
      await expect(
        processAlterUpload({
          buffer: Buffer.from("fake"),
          mimeType: "application/pdf",
          originalName: "scan.pdf",
          fileKey: "acad/alter/s/scan.pdf",
          fileSize: 4,
        })
      ).rejects.toMatchObject({ code: "SCAN_PDF" });
    } finally {
      spy.mockRestore();
    }
  });

  test("attachmentsToSourceText joins text attachments", () => {
    const text = attachmentsToSourceText([
      { kind: "text", name: "a.txt", text: "one" },
      { kind: "image", name: "b.png", key: "k" },
      { kind: "text", name: "c.md", text: "two" },
    ]);
    expect(text).toContain("### a.txt");
    expect(text).toContain("one");
    expect(text).toContain("### c.md");
    expect(text).not.toContain("b.png");
  });
});
