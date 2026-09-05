import httpMocks from "node-mocks-http";

jest.mock("../../src/_s3/fileBucket.js", () => ({
  fileS3: {},
  fileBucket: "test-bucket",
  signUrl: jest.fn(),
  signUrlForView: jest.fn(),
}));

jest.mock("../../src/_s3/archiveMulter.js", () => ({
  archiveMulter: { single: jest.fn() },
}));

jest.mock("../../src/_s3/formMulter.js", () => ({
  formMulter: { single: jest.fn() },
  isFormFileKey: jest.fn(),
}));

import { signBackup } from "../../src/controllers/files.js";

describe("signBackup", () => {
  test("admin cannot sign another academy backup key", async () => {
    const req = httpMocks.createRequest({
      user: { auth: "admin", academyId: "academy-a" },
      query: {
        key: "academy-b/backup/2026-09-05/users.json",
        fileName: "users.json",
      },
    });
    const res = httpMocks.createResponse();

    await signBackup(req, res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });

  test("rejects traversal-like backup keys", async () => {
    const req = httpMocks.createRequest({
      user: { auth: "admin", academyId: "academy-a" },
      query: {
        key: "academy-a/backup/../users.json",
        fileName: "users.json",
      },
    });
    const res = httpMocks.createResponse();

    await signBackup(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("KEY_INVALID");
  });
});
