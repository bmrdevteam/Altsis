/**
 * RAcademy API
 */
import httpMocks from "node-mocks-http";
import mongoose from "mongoose";

jest.mock("@models/Academy");
import { Academy } from "@models/Academy.js";
import * as academies from "@controllers/academies";

const reqQuery = {
  academyId: "abc",
};

const expectedAcademy = {
  _id: mongoose.Types.ObjectId(),
  academyId: "abc",
  academyName: "ABC",
};

describe("비로그인 유저", () => {
  it("Validate - academyId 쿼리를 포함하지 않은 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValueOnce(false),
    });
    const res = httpMocks.createResponse();

    await academies.find(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ACADEMYID_REQUIRED");
  });

  it("academy가 없는 경우 404 반환", async () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValueOnce(false),
      query: reqQuery,
    });
    const res = httpMocks.createResponse();

    Academy.findOne = jest.fn().mockResolvedValueOnce(undefined);

    await academies.find(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("ACADEMY_NOT_FOUND");
  });

  it("Success - academy 반환", async () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValueOnce(false),
      query: reqQuery,
    });
    const res = httpMocks.createResponse();

    Academy.findOne = jest.fn().mockResolvedValueOnce(expectedAcademy);

    await academies.find(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().academy).toEqual(expectedAcademy);
  });
});

describe("로그인 유저(owner)", () => {
  it("academy가 없는 경우 404 반환", async () => {
    const req = httpMocks.createRequest({
      user: {
        auth: "owner",
      },
      isAuthenticated: jest.fn().mockReturnValueOnce(true),
      query: reqQuery,
    });
    const res = httpMocks.createResponse();

    Academy.findOne = jest.fn().mockResolvedValueOnce(undefined);

    await academies.find(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("ACADEMY_NOT_FOUND");
  });

  it("Success - academy 반환", async () => {
    const req = httpMocks.createRequest({
      user: {
        auth: "owner",
      },
      isAuthenticated: jest.fn().mockReturnValueOnce(true),
      query: reqQuery,
    });
    const res = httpMocks.createResponse();

    Academy.findOne = jest.fn().mockResolvedValueOnce(expectedAcademy);

    await academies.find(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().academy).toEqual(expectedAcademy);
  });
});

describe("로그인 유저(owner 외)", () => {
  it("403 반환", async () => {
    const req = httpMocks.createRequest({
      user: {},
      isAuthenticated: jest.fn().mockReturnValueOnce(true),
      query: reqQuery,
    });
    const res = httpMocks.createResponse();

    await academies.find(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });
});
