/**
 * RAcademies API
 */
import httpMocks from "node-mocks-http";
import mongoose from "mongoose";

jest.mock("@models/Academy");
import { Academy } from "@models/Academy.js";
import * as academies from "@controllers/academies";

const reqUser = {
  auth: "owner",
};

const expectedAcademies = [
  { _id: mongoose.Types.ObjectId(), academyId: "abc", academyName: "ABC" },
  { _id: mongoose.Types.ObjectId(), academyId: "zxc", academyName: "ZXC" },
];

describe("Validate", () => {
  // 1. auth 검증
  it("auth가 owner가 아닌 경우 403 반환", async () => {
    const req = httpMocks.createRequest({
      user: { auth: "member" },
      isAuthenticated: jest.fn().mockReturnValueOnce(true),
    });
    const res = httpMocks.createResponse();

    await academies.find(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });
});

describe("Success", () => {
  it("academy 목록 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      isAuthenticated: jest.fn().mockReturnValueOnce(true),
    });
    const res = httpMocks.createResponse();

    Academy.find = jest.fn().mockResolvedValueOnce(expectedAcademies);

    await academies.find(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().academies).toEqual(expectedAcademies);
  });
});
