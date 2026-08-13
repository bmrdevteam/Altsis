import httpMocks from "node-mocks-http";
import { rejectUnauthenticated } from "../../src/middleware/authErrors.js";
import {
  isLoggedIn,
  isAdmin,
  isAdManager,
  isOwner,
} from "../../src/middleware/auth.js";

jest.mock("../../src/_database/mongodb/index.js", () => ({ conn: {} }));
jest.mock("../../src/_database/redis/index.js", () => ({
  client: { get: jest.fn() },
}));

describe("rejectUnauthenticated", () => {
  it("sends 401 NOT_LOGGED_IN when there is no session", () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValue(false),
    });
    const res = httpMocks.createResponse();

    expect(rejectUnauthenticated(req, res)).toBe(true);
    expect(res._getStatusCode()).toBe(401);
    expect(res._getData().message).toBe("NOT_LOGGED_IN");
  });

  it("returns false when the request is authenticated", () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValue(true),
    });
    const res = httpMocks.createResponse();

    expect(rejectUnauthenticated(req, res)).toBe(false);
    expect(res._getStatusCode()).toBe(200);
  });
});

describe("auth middleware", () => {
  const next = jest.fn();

  beforeEach(() => {
    next.mockClear();
  });

  it("isLoggedIn allows authenticated users", () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValue(true),
    });
    const res = httpMocks.createResponse();
    isLoggedIn(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("isLoggedIn rejects guests with 401", () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValue(false),
    });
    const res = httpMocks.createResponse();
    isLoggedIn(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(401);
    expect(res._getData().message).toBe("NOT_LOGGED_IN");
  });

  it("isAdmin rejects guests with 401, not 403", () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValue(false),
    });
    const res = httpMocks.createResponse();
    isAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(401);
    expect(res._getData().message).toBe("NOT_LOGGED_IN");
  });

  it("isAdmin rejects authenticated non-admins with 403", () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValue(true),
      user: { auth: "member" },
    });
    const res = httpMocks.createResponse();
    isAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });

  it("isAdManager allows manager", () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValue(true),
      user: { auth: "manager" },
    });
    const res = httpMocks.createResponse();
    isAdManager(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("isOwner rejects guests with 401", () => {
    const req = httpMocks.createRequest({
      isAuthenticated: jest.fn().mockReturnValue(false),
    });
    const res = httpMocks.createResponse();
    isOwner(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(401);
    expect(res._getData().message).toBe("NOT_LOGGED_IN");
  });
});
