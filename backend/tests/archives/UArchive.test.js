/**
 *
 * PUT /archives/:_id (아카이브 수정)
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

const studnetRID = "646cd3180e6d1dd0ea8894dc";

const req = httpMocks.createRequest({
  params: {
    _id: "646cd1c6077562593e9fdbbf",
  },
  user: {
    _id: "646cd300db64e85e165a26ee", // teacher
    academyId: "garisan",
  },
  body: {
    label: "인적 사항",
    data: { 이름: "이원서" },
    registration: studnetRID,
  },
});
const res = httpMocks.createResponse();

const expectedValue = {
  "인적 사항": {
    이름: "이원서",
  },
};

describe("PUT /archives/:_id (아카이브 조회 기능)", () => {
  it("archive가 없는 경우 404 반환", async () => {
    Archive.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue(undefined),
      };
    });
    await archives.update(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("ARCHIVE_NOT_FOUND");
  });

  it("school이 없는 경우 404 반환", async () => {
    Archive.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          _id: "646cd1c6077562593e9fdbbf",
          school: "646cd5e33080ffb2799c2bcc",
        }),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue(undefined),
      };
    });

    await archives.update(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("SCHOOL_NOT_FOUND");
  });

  it("school.formArchive.data['인적사항']이 없는 경우 404 반환", async () => {
    Archive.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          _id: "646cd1c6077562593e9fdbbf",
          school: "646cd5e33080ffb2799c2bcc",
        }),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValue({
          _id: "646cd5e33080ffb2799c2bcc",
          formArchive: [{ label: "동아리 활동" }, { label: "독서 활동" }],
        }),
      };
    });

    await archives.update(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("FORMARCHIVE_ITEM_NOT_FOUND");
  });
});

describe("formArchiveItem.authTeacher==='viewAndEditStudents'", () => {
  const setup = () => {
    Archive.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          _id: "646cd1c6077562593e9fdbbf",
          user: "646d61f66b31dd8e289659d6",
          school: "646cd5e33080ffb2799c2bcc",
          data: {
            "인적 사항": {
              이름: "이이이",
              나이: "12",
            },
            봉사활동: [{ 무엇을: "봉사를" }],
          },
          save: jest.fn().mockResolvedValue(true),
        }),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          _id: "646cd5e33080ffb2799c2bcc",
          formArchive: [
            { label: "동아리 활동" },
            { label: "독서 활동" },
            { label: "인적 사항", authTeacher: "viewAndEditStudents" },
          ],
        }),
      };
    });
  };
  it("studentRegistration이 없는 경우 404 반환", async () => {
    setup();
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(undefined),
      };
    });
    await archives.update(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("REGISTRATION(STUDENT)_NOT_FOUND");
  });

  it("teacherRegistration이 없는 경우 404 반환", async () => {
    setup();
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({}),
        findOne: jest.fn().mockResolvedValueOnce(undefined),
      };
    });

    await archives.update(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("REGISTRATION(TEACHER)_NOT_FOUND");
  });

  it("archive 반환", async () => {
    setup();
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({}),
        findOne: jest.fn().mockResolvedValueOnce({}),
      };
    });

    await archives.update(req, res);
    const { archive } = res._getData();
    expect(res._getStatusCode()).toBe(200);
    expect(archive.data).toEqual(expectedValue);
  });
});

describe("formArchiveItem.authTeacher==='viewAndEditMyStudents'", () => {
  const setup = () => {
    Archive.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          _id: "646cd1c6077562593e9fdbbf",
          user: "646d61f66b31dd8e289659d6",
          school: "646cd5e33080ffb2799c2bcc",
          data: {
            "인적 사항": {
              이름: "이이이",
              나이: "12",
            },
            봉사활동: [{ 무엇을: "봉사를" }],
          },
          save: jest.fn().mockResolvedValue(true),
        }),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          _id: "646cd5e33080ffb2799c2bcc",
          formArchive: [
            { label: "동아리 활동" },
            { label: "독서 활동" },
            { label: "인적 사항", authTeacher: "viewAndEditMyStudents" },
          ],
        }),
      };
    });
  };
  it("studentRegistration이 없는 경우 404 반환", async () => {
    setup();
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce(undefined),
      };
    });

    await archives.update(req, res);
    expect(res._getStatusCode()).toBe(404);
    expect(res._getData().message).toBe("REGISTRATION(STUDENT)_NOT_FOUND");
  });

  it("요청자가 studentRegistration의 담임도 아니고 부담임도 아닌 경우 403 반환", async () => {
    setup();
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({}),
      };
    });

    await archives.update(req, res);
    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
  });

  it("담임인 경우 archive 반환", async () => {
    setup();
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          teacher: mongoose.Types.ObjectId("646cd300db64e85e165a26ee"),
        }),
      };
    });

    await archives.update(req, res);
    const { archive } = res._getData();

    expect(res._getStatusCode()).toBe(200);
    expect(archive.data).toEqual(expectedValue);
  });

  it("부담임인 경우 archive 반환", async () => {
    setup();
    Registration.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          subTeacher: mongoose.Types.ObjectId("646cd300db64e85e165a26ee"),
        }),
      };
    });

    await archives.update(req, res);
    const { archive } = res._getData();

    expect(res._getStatusCode()).toBe(200);
    expect(archive.data).toEqual(expectedValue);
  });
});

describe("formArchiveItem.authTeacher is invalid", () => {
  it("formArchiveItem.authTeacher가 유효하지 경우 400 반환", async () => {
    Archive.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          _id: "646cd1c6077562593e9fdbbf",
          school: "646cd5e33080ffb2799c2bcc",
        }),
      };
    });
    School.mockImplementation(() => {
      return {
        findById: jest.fn().mockResolvedValueOnce({
          _id: "646cd5e33080ffb2799c2bcc",
          formArchive: [
            { label: "동아리 활동" },
            { label: "독서 활동" },
            { label: "인적 사항", authTeacher: "undefined" },
          ],
        }),
      };
    });

    await archives.update(req, res);
    expect(res._getStatusCode()).toBe(400);
  });
});
