/**
 *
 * GET /archives/:_id (아카이브 조회)
 */
import httpMocks from "node-mocks-http";
import * as archives from "@controllers/archives";

jest.mock("@models/Archive");
jest.mock("@models/School");
jest.mock("@models/Registration");

import { Archive } from "@models/Archive.js";
import { School } from "@models/School.js";
import { Registration } from "@models/Registration.js";
import mongoose from "mongoose";

describe("GET /archives?registrationId=***&label=***", () => {
  const studentRegistration = {
    _id: mongoose.Types.ObjectId("646cd3180e6d1dd0ea8894dc"),
    user: mongoose.Types.ObjectId("646d65f7642806b00a07d877"),
  };
  const teacherRegistration = {
    _id: mongoose.Types.ObjectId("646cd300db64e85e165a26ee"),
    user: mongoose.Types.ObjectId("646d66395b66b2fe4eb27414"),
  };
  const label = "인적 사항";
  const school = {
    _id: mongoose.Types.ObjectId("646cd5e33080ffb2799c2bcc"),
    formArchive: [
      { label: label, authStudent: "view", authTeacher: "viewAndEditStudents" },
      { label: "동아리 활동" },
      { label: "독서 활동" },
    ],
  };
  const archive = {
    _id: mongoose.Types.ObjectId("646cd1c6077562593e9fdbbf"),
    user: studentRegistration.user,
    school: school._id,
    data: {
      [label]: {
        이름: "이이이",
        나이: "12",
      },
      봉사활동: [{ 무엇을: "봉사를" }],
    },
    save: jest.fn().mockResolvedValue(true),
  };
  const expectedValue = {
    [label]: {
      이름: "이이이",
      나이: "12",
    },
  };

  const reqByTeacher = httpMocks.createRequest({
    query: {
      registrationId: studentRegistration._id.toString(),
      label,
    },
    user: {
      _id: teacherRegistration.user,
      academyId: "garisan",
    },
  });
  const reqByStudent = httpMocks.createRequest({
    query: {
      registrationId: studentRegistration._id.toString(),
      label,
    },
    user: {
      _id: studentRegistration.user,
      academyId: "garisan",
    },
  });
  const res = httpMocks.createResponse();

  it("studentRegistration이 없는 경우 404 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(undefined),
      };
    });
    await archives.find(reqByTeacher, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("REGISTRATION(STUDENT)_NOT_FOUND");
  });

  it("school이 없는 경우 404 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(studentRegistration),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue(undefined),
      };
    });

    await archives.find(reqByTeacher, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("SCHOOL_NOT_FOUND");
  });

  it("school.formArchive.data[label]이 없는 경우 404 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(studentRegistration),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue({
          ...school,
          formArchive: [{ label: "동아리 활동" }, { label: "독서 활동" }],
        }),
      };
    });

    await archives.find(reqByTeacher, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("FORMARCHIVE_ITEM_NOT_FOUND");
  });

  it("학생 조회 시 권한(view)이 없는 경우 403 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(studentRegistration),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue({
          ...school,
          formArchive: [{ label: label, authStudent: "undefined" }],
        }),
      };
    });

    await archives.find(reqByStudent, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });

  it("선생님 조회 시 권한(viewAndEditStudents)이 필요하고 선생님 registration이 없으면 403 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(studentRegistration),
        findOne: jest.fn().mockResolvedValueOnce(undefined),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue({
          ...school,
          formArchive: [{ label: label, authTeacher: "viewAndEditStudents" }],
        }),
      };
    });

    await archives.find(reqByTeacher, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });

  it("선생님 조회 시 권한(viewAndEditMyStudents)이 없는 경우 403 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(studentRegistration),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue({
          ...school,
          formArchive: [{ label: label, authTeacher: "viewAndEditMyStudents" }],
        }),
      };
    });

    await archives.find(reqByTeacher, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });

  it("선생님 조회 시 권한이 없는 경우 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(studentRegistration),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue({
          ...school,
          formArchive: [{ label: label }],
        }),
      };
    });

    await archives.find(reqByTeacher, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });

  it("archive가 없는 경우 생성 후 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(studentRegistration),
        findOne: jest.fn().mockResolvedValueOnce(teacherRegistration),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue(school),
      };
    });
    Archive.mockImplementation(() => {
      return {
        findOne: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue(archive),
      };
    });

    await archives.find(reqByTeacher, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().archive.data).toEqual(expectedValue);
  });

  it("archive가 있는 경우 반환", async () => {
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(studentRegistration),
        findOne: jest.fn().mockResolvedValueOnce(teacherRegistration),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue(school),
      };
    });
    Archive.mockImplementation(() => {
      return {
        findOne: jest.fn().mockResolvedValue(archive),
      };
    });

    await archives.find(reqByTeacher, res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData().archive.data).toEqual(expectedValue);
  });
});
