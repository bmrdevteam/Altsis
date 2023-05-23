import httpMocks from "node-mocks-http";
import * as test from "../../controllers/test";

jest.mock("../../models/User");
import { User } from "../../models/User";

it("GET /api/test/user는 사용자 정보를 반환한다.", async () => {
  const req = httpMocks.createRequest({
    user: {
      _id: "646c4c1048dc378a019a7a51",
      academyId: "garisan",
    },
  });
  const res = httpMocks.createResponse();

  User.mockImplementation(() => {
    return {
      findById: jest.fn().mockResolvedValue({
        _id: "646c4c1048dc378a019a7a51",
        userName: "myuser02",
      }),
    };
  });

  await test.findMyself(req, res);

  const { user } = res._getData();
  expect(res._getStatusCode()).toBe(200);
  expect(user._id).toBe("646c4c1048dc378a019a7a51");
});
