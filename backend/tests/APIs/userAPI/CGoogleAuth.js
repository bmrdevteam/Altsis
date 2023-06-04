/**
 * CGoogleAuth API
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
  it("400 EMAIL_REQUIRED", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {},
    });
    const res = httpMocks.createResponse();

    await users.connectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("EMAIL_REQUIRED");
  });

  it("400 EMAIL_INVALID", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {
        email: "abc",
      },
    });
    const res = httpMocks.createResponse();

    await users.connectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("EMAIL_INVALID");
  });

  it("404 USER_NOT_FOUND", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {
        email: "asdf@asdfa.asdf",
      },
    });
    const res = httpMocks.createResponse();

    User.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(undefined),
      };
    });

    await users.connectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("USER_NOT_FOUND");
  });

  it("409 CONNECTED_ALREADY", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {
        email: "asdf@asdfa.asdf",
      },
    });
    const res = httpMocks.createResponse();

    User.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          snsId: {
            google: "asdf",
          },
        }),
      };
    });

    await users.connectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(409);
    expect(res._getData().message).toBe("EMAIL_CONNECTED_ALREADY");
  });

  it("409 EMAIL_IN_USE", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {
        email: "asdf@asdfa.asdf",
      },
    });
    const res = httpMocks.createResponse();

    User.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({}),
        findOne: jest.fn().mockResolvedValueOnce(true),
      };
    });

    await users.connectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(409);
    expect(res._getData().message).toBe("EMAIL_IN_USE");
  });
});

describe("Success", () => {
  it("Success and return snsId", async () => {
    const expectedSnsId = {
      google: "asdf@asdfa.asdf",
    };

    const req = httpMocks.createRequest({
      user: reqUser,
      body: {
        email: expectedSnsId.google,
      },
    });
    const res = httpMocks.createResponse();

    User.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          save: jest.fn().mockResolvedValue(true),
        }),
        findOne: jest.fn().mockResolvedValueOnce(false),
      };
    });

    await users.connectGoogleAuth(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().snsId).toEqual(expectedSnsId);
  });
});
