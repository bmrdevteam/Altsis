import { archiveSectionHasFileKey } from "../../src/services/archiveFileKey.js";

const KEY = "academy/archive/photo.jpg";
const OTHER = "academy/archive/other.jpg";

describe("archiveSectionHasFileKey", () => {
  test("matches object archive field key", () => {
    const data = {
      인적사항: { 사진: { key: KEY, originalName: "a.jpg" } },
    };
    expect(archiveSectionHasFileKey(data, "인적사항", "사진", KEY)).toBe(true);
  });

  test("rejects object archive with different key", () => {
    const data = {
      인적사항: { 사진: { key: OTHER, originalName: "a.jpg" } },
    };
    expect(archiveSectionHasFileKey(data, "인적사항", "사진", KEY)).toBe(false);
  });

  test("matches a row in array archive", () => {
    const data = {
      수상경력: [
        { 제목: "대회", 사진: { key: OTHER, originalName: "b.jpg" } },
        { 제목: "공모", 사진: { key: KEY, originalName: "a.jpg" } },
      ],
    };
    expect(archiveSectionHasFileKey(data, "수상경력", "사진", KEY)).toBe(true);
  });

  test("rejects array archive when no row has the key", () => {
    const data = {
      수상경력: [{ 사진: { key: OTHER, originalName: "b.jpg" } }],
    };
    expect(archiveSectionHasFileKey(data, "수상경력", "사진", KEY)).toBe(false);
  });

  test("rejects missing or empty sections", () => {
    expect(archiveSectionHasFileKey({}, "인적사항", "사진", KEY)).toBe(false);
    expect(archiveSectionHasFileKey({ 인적사항: {} }, "인적사항", "사진", KEY)).toBe(
      false
    );
    expect(archiveSectionHasFileKey({ 수상경력: [] }, "수상경력", "사진", KEY)).toBe(
      false
    );
    expect(archiveSectionHasFileKey(null, "인적사항", "사진", KEY)).toBe(false);
    expect(archiveSectionHasFileKey({ 인적사항: "x" }, "인적사항", "사진", KEY)).toBe(
      false
    );
  });

  test("rejects incomplete arguments", () => {
    const data = { 인적사항: { 사진: { key: KEY, originalName: "a.jpg" } } };
    expect(archiveSectionHasFileKey(data, "", "사진", KEY)).toBe(false);
    expect(archiveSectionHasFileKey(data, "인적사항", "", KEY)).toBe(false);
    expect(archiveSectionHasFileKey(data, "인적사항", "사진", "")).toBe(false);
  });
});
