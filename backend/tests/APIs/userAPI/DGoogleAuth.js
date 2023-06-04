/**
 * DGoogleAuth API
 */
import httpMocks from "node-mocks-http";

jest.mock("@models/User");
import { User } from "@models/User.js";
import * as users from "@controllers/users";

const reqUser = {
  academyId: "abc",
  auth: "admin",
};

describe("Validate", () => {
  it("404 USER_NOT_FOUND", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
    });
    const res = httpMocks.createResponse();

    User.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(undefined),
      };
    });

    await users.disconnectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("USER_NOT_FOUND");
  });

  it("409 EMAIL_DISCONNECTED_ALREADY", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
    });
    const res = httpMocks.createResponse();

    User.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          snsId: {},
        }),
      };
    });

    await users.disconnectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(409);
    expect(res._getData().message).toBe("EMAIL_DISCONNECTED_ALREADY");
  });
});

describe("Success", () => {
  it("Success and return snsId", async () => {
    const expectedSnsId = {};

    const req = httpMocks.createRequest({
      user: reqUser,
    });
    const res = httpMocks.createResponse();

    User.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          snsId: { google: "asdf" },
          save: jest.fn().mockResolvedValue(true),
        }),
      };
    });

    await users.disconnectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().snsId).toEqual(expectedSnsId);
  });
});
