import { asksPublicWeb, runChatWeb } from "../../../services/alterChatWeb.js";

describe("chatbot web search", () => {
  test("a weather question is a public web request", () => {
    expect(asksPublicWeb("오늘 서울 날씨를 웹에서 찾아 줘")).toBe(true);
    expect(asksPublicWeb("막대 차트 그림을 만들어 줘")).toBe(false);
    expect(asksPublicWeb("이번 주 할 일")).toBe(false);
  });

  test("a flag that is off blocks the owner before any search", async () => {
    const search = jest.fn();
    const result = await runChatWeb({
      academyId: "eval",
      user: { _id: "owner-1", auth: "owner" },
      academy: { webSearchEnabled: false },
      registration: { role: "teacher" },
      message: "오늘 서울 날씨를 웹에서 찾아 줘",
      search,
    });
    expect(search).not.toHaveBeenCalled();
    expect(result.handled).toBe(true);
    expect(result.text).toContain("웹 검색이 꺼져 있습니다.");
    expect(result.text).toContain("학원 소유자가 AI 설정에서 켤 수 있습니다.");
  });

  test("a flag that is on searches and leaves the answer to the chat model", async () => {
    const search = jest.fn(async () => ({
      summary: "검색 결과: 공공 날씨",
      results: [{ title: "공공 날씨", url: "https://example.com/weather" }],
      links: [{ kind: "web", title: "공공 날씨", path: "https://example.com/weather" }],
    }));
    const result = await runChatWeb({
      academyId: "eval",
      user: { _id: "teacher-1", auth: "member" },
      academy: { webSearchEnabled: true },
      registration: { role: "teacher" },
      message: "오늘 날씨를 웹에서 찾아 줘",
      search,
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(result.handled).toBe(false);
    expect(result.preface).toContain("공공 날씨");
    expect(result.links[0].path).toBe("https://example.com/weather");
  });
});
