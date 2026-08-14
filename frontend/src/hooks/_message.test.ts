import { messageFromError } from "./_message";

describe("messageFromError", () => {
  test("maps axios response codes such as SEASON_SEAT_LIMIT", () => {
    const err = {
      response: { data: { message: "SEASON_SEAT_LIMIT" } },
    };
    expect(messageFromError(err)).toBe(
      "활성 학기 등록 인원이 ALT 좌석 한도에 도달했습니다. 소유자에게 한도 상향을 요청하세요."
    );
  });

  test("does not treat the error object itself as a message key", () => {
    expect(messageFromError({ message: "Request failed with status code 403" })).toBe(
      "알 수 없는 에러가 발생했습니다."
    );
  });

  test("falls back for missing or unknown codes", () => {
    expect(messageFromError(undefined)).toBe("알 수 없는 에러가 발생했습니다.");
    expect(
      messageFromError({ response: { data: { message: "NOT_A_REAL_CODE" } } })
    ).toBe("알 수 없는 에러가 발생했습니다.");
  });
});
