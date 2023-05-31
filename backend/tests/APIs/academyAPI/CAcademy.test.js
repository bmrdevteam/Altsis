/**
 * CAcademy API
 */
import httpMocks from "node-mocks-http";

import mongoose from "mongoose";
import * as password from "../../../utils/password.js";

jest.mock("@models/Academy");
jest.mock("@models/User");

import { Academy } from "@models/Academy.js";
import { User } from "@models/User.js";

import * as academies from "@controllers/academies";

const reqUser = {
  academyId: "head",
};

const reqBodyValid = {
  academyId: "abc",
  academyName: "알파벳",
  adminId: "abcAdmin",
  adminName: "abc관리자",
  email: "abcabc@abc.abc",
  tel: "010-1111-1111",
};

const expectedAcademy = {
  _id: mongoose.Types.ObjectId(),
  academyId: "abc",
  academyName: "알파벳",
  adminId: "abcAdmin",
  adminName: "abc관리자",
  email: "abcabc@abc.abc",
  tel: "010-1111-1111",
};

const expectedAdmin = {
  userId: "abcAdmin",
  userName: "abc관리자",
  password: "12345678",
};

describe("Validate", () => {
  const reqBody1 = {};
  const reqBody2 = { ...reqBody1, academyId: reqBodyValid.academyId };
  const reqBody3 = { ...reqBody2, academyName: reqBodyValid.academyName };
  const reqBody4 = { ...reqBody3, adminId: reqBodyValid.adminId };
  const reqBody5 = { ...reqBody4, adminName: reqBodyValid.adminName };

  // 1. academyId 검증
  it("academyId가 없는 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBody1,
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ACADEMYID_REQUIRED");
  });

  it("academyId가 유효하지 않은 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: { ...reqBody1, academyId: "1" },
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ACADEMYID_INVALID");
  });

  // academyName 검증
  it("academyName이 없는 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBody2,
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ACADEMYNAME_REQUIRED");
  });

  it("academyName이 유효하지 않은 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: { ...reqBody2, academyName: "1" },
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ACADEMYNAME_INVALID");
  });

  // adminId 검증
  it("adminId 없는 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBody3,
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ADMINID_REQUIRED");
  });
  it("adminId 유효하지 않은 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: { ...reqBody3, adminId: "1" },
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ADMINID_INVALID");
  });

  // adminName 검증
  it("adminName 없는 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBody4,
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ADMINNAME_REQUIRED");
  });
  it("adminName 유효하지 않은 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: { ...reqBody4, adminName: "1" },
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("ADMINNAME_INVALID");
  });

  it("email 유효하지 않은 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: { ...reqBody5, email: "1" },
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("EMAIL_INVALID");
  });

  it("tel 유효하지 않은 경우 400 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: { ...reqBody5, email: reqBodyValid.email, tel: "0asdf" },
    });
    const res = httpMocks.createResponse();

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("TEL_INVALID");
  });
});

describe("Duplicate", () => {
  it("academyId가 중복되는 경우 409 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBodyValid,
    });
    const res = httpMocks.createResponse();

    Academy.findOne = jest.fn().mockResolvedValue(true);

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(409);
    expect(res._getData().message).toBe("ACADEMYID_IN_USE");
  });
});

describe("Success", () => {
  it("academy 생성 후 academy, admin 반환", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBodyValid,
    });
    const res = httpMocks.createResponse();

    Academy.findOne = jest.fn().mockResolvedValueOnce(false);
    Academy.create = jest.fn().mockResolvedValueOnce(expectedAcademy);
    password.generatePassword = jest
      .fn()
      .mockReturnValueOnce(expectedAdmin.password);

    User.mockImplementation(() => {
      return {
        create: jest.fn().mockResolvedValue(expectedAdmin),
      };
    });

    await academies.create(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().academy).toEqual(expectedAcademy);
    expect(res._getData().admin).toEqual(expectedAdmin);
  });
});
