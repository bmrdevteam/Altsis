import httpMocks from "node-mocks-http";

jest.mock("../../src/_s3/fileBucket.js", () => ({
  fileS3: {
    listObjectsV2: jest.fn(),
    deleteObjects: jest.fn(),
    upload: jest.fn(),
    getObject: jest.fn(),
  },
  fileBucket: "test-bucket",
}));

jest.mock("../../src/models/Academy.js", () => ({
  Academy: { findOne: jest.fn() },
}));

import { Academy } from "../../src/models/Academy.js";
import * as academies from "../../src/controllers/academies.js";

describe("아카데미 비밀 설정 접근", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    ["SMTP 조회", academies.getEmailSmtp],
    ["SMTP 수정", academies.updateEmailSmtp],
    ["메일 유형 수정", academies.updateEmailNotifyTypes],
    ["SMTP 시험 발송", academies.testEmailSmtp],
    ["AI 키 수정", academies.updateAiApiKey],
    ["AI 모델 수정", academies.updateAiModel],
    ["AI 키 확인", academies.checkAiApiKey],
    ["백업 생성", academies.createBackup],
    ["백업 복원", academies.restoreBackup],
    ["백업 조회", academies.findBackup],
    ["백업 삭제", academies.removeBackup],
    ["문서 조회", academies.findDocuments],
  ])("%s는 다른 아카데미 admin에게 403을 반환", async (_label, handler) => {
    const req = httpMocks.createRequest({
      user: { auth: "admin", academyId: "academy-a" },
      params: { academyId: "academy-b" },
      body: {},
    });
    const res = httpMocks.createResponse();

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    expect(res._getData().message).toBe("PERMISSION_DENIED");
    expect(Academy.findOne).not.toHaveBeenCalled();
  });
});
