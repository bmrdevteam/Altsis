/**
 * CUser API
 */
import httpMocks from "node-mocks-http";
import mongoose from "mongoose";

jest.mock("@models/User");
import { User } from "@models/User.js";
import * as users from "@controllers/users";

jest.mock("@models/School");
import { School } from "@models/School.js";

const reqUser = {
  academyId: "abc",
  academyName: "abc학교",
  auth: "admin",
};

describe("Validate", () => {
  it("400 SCHOOLS_REQUIRED", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {},
    });
    const res = httpMocks.createResponse();

    await users.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("SCHOOLS_REQUIRED");
  });

  it("400 SCHOOLS_INVALID", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {
        schools: [{ asdf: "asdf" }],
      },
    });
    const res = httpMocks.createResponse();

    await users.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("SCHOOLS_INVALID");
  });

  it("400 AUTH_REQUIRED", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {
        schools: [{ school: mongoose.Types.ObjectId() }],
      },
    });
    const res = httpMocks.createResponse();

    await users.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("AUTH_REQUIRED");
  });

  it("400 AUTH_INVALID", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: {
        schools: [{ school: mongoose.Types.ObjectId() }],
        auth: "asdf",
      },
    });
    const res = httpMocks.createResponse();

    await users.create(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(res._getData().message).toBe("AUTH_INVALID");
  });
});

describe("Check Duplication", () => {
  const reqBody = {
    schools: [{ school: mongoose.Types.ObjectId() }],
    auth: "member",
    userId: "user01",
    userName: "사용자01",
    password: "asdfasdfwe!!!",
    tel: "010-0000-0000",
    email: "asdf@asdfasdf.com",
    snsId: {
      google: "asdf@asdfasdf.com",
    },
  };

  it("404 USERID_IN_USE", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBody,
    });
    const res = httpMocks.createResponse();

    User.mockImplementation(() => {
      return {
        findOne: jest.fn().mockResolvedValueOnce(true),
      };
    });

    await users.create(req, res);
    expect(res._getStatusCode()).toBe(409);
    expect(res._getData().message).toBe("USERID_IN_USE");
  });

  it("409 SNSID.GOOGLE_IN_USE", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBody,
    });
    const res = httpMocks.createResponse();

    User.mockImplementationOnce(() => {
      return {
        findOne: jest.fn().mockResolvedValueOnce(false),
      };
    }).mockImplementationOnce(() => {
      return {
        findOne: jest.fn().mockResolvedValueOnce(true),
      };
    });

    await users.create(req, res);
    expect(res._getStatusCode()).toBe(409);
    expect(res._getData().message).toBe("SNSID.GOOGLE_IN_USE");
  });
});

describe("Find Schools", () => {
  const reqBody = {
    schools: [{ school: mongoose.Types.ObjectId() }],
    auth: "member",
    userId: "user01",
    userName: "사용자01",
    password: "asdfasdfwe!!!",
    tel: "010-0000-0000",
    email: "asdf@asdfasdf.com",
    snsId: {
      google: "asdf@asdfasdf.com",
    },
  };

  it("404 SCHOOL_NOT_FOUND", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBody,
    });
    const res = httpMocks.createResponse();

    User.mockImplementationOnce(() => {
      return {
        findOne: jest.fn().mockResolvedValueOnce(false),
      };
    }).mockImplementationOnce(() => {
      return {
        findOne: jest.fn().mockResolvedValueOnce(false),
      };
    });

    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(false),
      };
    });

    await users.create(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("SCHOOL_NOT_FOUND");
  });
});

describe("Success", () => {
  const reqBody = {
    schools: [{ school: mongoose.Types.ObjectId() }],
    auth: "member",
    userId: "user01",
    userName: "사용자01",
    password: "asdfasdfwe!!!",
    tel: "010-0000-0000",
    email: "asdf@asdfasdf.com",
    snsId: {
      google: "asdf@asdfasdf.com",
    },
  };

  const expectedUser = {
    ...reqBody,
    schools: [
      {
        school: reqBody.schools[0].school,
        schoolId: "abc",
        schoolName: "abc학교",
      },
    ],
    academyId: reqUser.academyId,
    academyName: reqUser.academyName,
  };

  it("200 Success", async () => {
    const req = httpMocks.createRequest({
      user: reqUser,
      body: reqBody,
    });
    const res = httpMocks.createResponse();

    User.mockImplementationOnce(() => {
      return {
        findOne: jest.fn().mockResolvedValueOnce(false),
      };
    })
      .mockImplementationOnce(() => {
        return {
          findOne: jest.fn().mockResolvedValueOnce(false),
        };
      })
      .mockImplementationOnce(() => {
        return {
          create: jest.fn().mockResolvedValueOnce(expectedUser),
        };
      });

    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(expectedUser.schools[0]),
      };
    });

    await users.create(req, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().user).toEqual(expectedUser);
  });
});
