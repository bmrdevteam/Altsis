import {
  getArchiveIdFromDbData,
  isArchiveFileValue,
  parseArchiveImageLocation,
} from "./archiveImage";

describe("isArchiveFileValue", () => {
  test("accepts key and originalName", () => {
    expect(
      isArchiveFileValue({ key: "a/archive/x.jpg", originalName: "x.jpg" })
    ).toBe(true);
  });

  test("rejects missing or empty key", () => {
    expect(isArchiveFileValue({ originalName: "x.jpg" })).toBe(false);
    expect(isArchiveFileValue({ key: "", originalName: "x.jpg" })).toBe(false);
    expect(isArchiveFileValue("x.jpg")).toBe(false);
    expect(isArchiveFileValue(null)).toBe(false);
  });
});

describe("parseArchiveImageLocation", () => {
  test("parses school archive field path", () => {
    expect(
      parseArchiveImageLocation("bmr//archive//인적 사항//사진")
    ).toEqual({
      schoolId: "bmr",
      label: "인적 사항",
      fieldLabel: "사진",
    });
  });

  test("rejects non-archive or short paths", () => {
    expect(parseArchiveImageLocation("bmr//evaluation//학년도")).toBeNull();
    expect(parseArchiveImageLocation("bmr//archive//인적 사항")).toBeNull();
    expect(parseArchiveImageLocation("")).toBeNull();
    expect(parseArchiveImageLocation(undefined)).toBeNull();
  });
});

describe("getArchiveIdFromDbData", () => {
  test("reads sibling archiveId", () => {
    const dbData = {
      bmr: { archive: { 인적사항: {} }, archiveId: "arc-1" },
    };
    expect(getArchiveIdFromDbData(dbData, "bmr")).toBe("arc-1");
  });

  test("returns undefined when missing", () => {
    expect(getArchiveIdFromDbData({ bmr: { archive: {} } }, "bmr")).toBeUndefined();
    expect(getArchiveIdFromDbData(undefined, "bmr")).toBeUndefined();
    expect(getArchiveIdFromDbData({ bmr: { archiveId: "" } }, "bmr")).toBeUndefined();
  });
});
