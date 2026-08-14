jest.mock("../../src/log/logger.js", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const mockFileList = jest.fn();
const mockProfileList = jest.fn();
const mockFileDelete = jest.fn();
const mockAcademyUpdateOne = jest.fn();
const mockAcademyFindOne = jest.fn();

jest.mock("../../src/_s3/fileBucket.js", () => ({
  fileS3: {
    listObjectsV2: (params) => ({
      promise: () => mockFileList(params),
    }),
    deleteObject: (params) => ({
      promise: () => mockFileDelete(params),
    }),
  },
  fileBucket: "file-bucket",
}));

jest.mock("../../src/_s3/profileBucket.js", () => ({
  profileS3: {
    listObjectsV2: (params) => ({
      promise: () => mockProfileList(params),
    }),
  },
  profileBucket: "profile-bucket",
}));

jest.mock("../../src/models/index.js", () => ({
  Academy: {
    updateOne: (...args) => mockAcademyUpdateOne(...args),
    findOne: (...args) => mockAcademyFindOne(...args),
  },
}));

import { STORAGE_LIMIT } from "../../src/messages/index.js";
import {
  FILE_STORAGE_CATEGORIES,
  PROFILE_STORAGE_CATEGORIES,
  commitAcademyUpload,
  incrementTokenUsage,
  sumAcademyStorageBytes,
} from "../../src/services/academyStorage.js";

describe("academyStorage", () => {
  test("prefixes are scoped to the academy id", () => {
    const id = "alpha";
    const filePrefixes = FILE_STORAGE_CATEGORIES.map((c) => c.prefix(id));
    const profilePrefixes = PROFILE_STORAGE_CATEGORIES.map((c) => c.prefix(id));
    expect(filePrefixes.every((p) => p.startsWith(`${id}/`))).toBe(true);
    expect(filePrefixes.some((p) => p.startsWith(`${id}2/`))).toBe(false);
    expect(profilePrefixes).toEqual([`original/${id}/`, `thumb/${id}/`]);
  });

  test("sumAcademyStorageBytes lists only this academy prefixes and sums sizes", async () => {
    mockFileList.mockImplementation(async (params) => {
      expect(params.Prefix.startsWith("acad/")).toBe(true);
      expect(params.Prefix.startsWith("other/")).toBe(false);
      return {
        Contents: [{ Size: 10, Key: `${params.Prefix}a.bin` }],
        IsTruncated: false,
      };
    });
    mockProfileList.mockImplementation(async (params) => {
      expect(
        params.Prefix === "original/acad/" || params.Prefix === "thumb/acad/"
      ).toBe(true);
      return {
        Contents: [{ Size: 5, Key: `${params.Prefix}p.jpg` }],
        IsTruncated: false,
      };
    });

    const { totalBytes, categories } = await sumAcademyStorageBytes("acad");
    const expected =
      FILE_STORAGE_CATEGORIES.length * 10 + PROFILE_STORAGE_CATEGORIES.length * 5;
    expect(totalBytes).toBe(expected);
    expect(categories).toHaveLength(
      FILE_STORAGE_CATEGORIES.length + PROFILE_STORAGE_CATEGORIES.length
    );
  });

  test("incrementTokenUsage $inc usedTokens", async () => {
    mockAcademyFindOne.mockResolvedValue(null);
    mockAcademyUpdateOne.mockResolvedValue({});
    await incrementTokenUsage("acad", 1234);
    expect(mockAcademyUpdateOne).toHaveBeenCalledWith(
      { academyId: "acad" },
      { $inc: { "plans.ctrl.usedTokens": 1234 } }
    );
  });

  test("commitAcademyUpload rolls back when the cached usage would exceed the limit", async () => {
    mockAcademyFindOne.mockResolvedValue({
      academyId: "acad",
      plans: {
        alt: { enabled: true, seasonSeatLimit: null },
        shift: {
          enabled: true,
          storageLimitBytes: 100,
          usedBytes: 90,
          usageSyncedAt: new Date(),
        },
        ctrl: { enabled: false, tokenLimit: null, usedTokens: 0 },
      },
    });
    mockFileDelete.mockResolvedValue({});

    await expect(
      commitAcademyUpload("acad", {
        size: 20,
        key: "acad/chat/x.bin",
        bucket: "file-bucket",
      })
    ).rejects.toMatchObject({ code: STORAGE_LIMIT });
    expect(mockFileDelete).toHaveBeenCalled();
    expect(mockAcademyUpdateOne).not.toHaveBeenCalled();
  });
});
