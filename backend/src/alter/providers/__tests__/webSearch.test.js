import { runProviderWebSearch } from "../webSearch.js";
import { runAlterWebSearch } from "../../../services/alterWebSearch.js";

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

describe("provider web search", () => {
  test("a scripted key never calls the network", async () => {
    let called = false;
    const result = await runProviderWebSearch({
      provider: "openai",
      apiKey: "scripted-local-dev",
      query: "오늘 날씨",
      fetchImpl: async () => {
        called = true;
        return jsonResponse({});
      },
    });
    expect(called).toBe(false);
    expect(result.scripted).toBe(true);
    expect(result.results[0]).toMatchObject({
      title: "공공 날씨 안내",
      url: "https://example.com/weather",
    });
    expect(result.usage.totalTokens).toBe(20);
  });

  test("openai, anthropic, and gemini hits stay titles and https urls", async () => {
    const key = "sk-test-secret-value";
    const cases = [
      {
        provider: "openai",
        url: "https://api.openai.com/v1/responses",
        header: "authorization",
        body: {
          output: [
            {
              content: [
                {
                  annotations: [
                    { type: "url_citation", url: "https://example.com/weather", title: "공공 날씨 안내" },
                    { type: "url_citation", url: "http://insecure.example/x", title: "빼기" },
                  ],
                },
              ],
            },
          ],
          usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14 },
        },
      },
      {
        provider: "anthropic",
        url: "https://api.anthropic.com/v1/messages",
        header: "x-api-key",
        body: {
          content: [
            {
              type: "web_search_tool_result",
              content: [
                {
                  type: "web_search_result",
                  url: "https://example.com/weather",
                  title: "공공 날씨 안내",
                  encrypted_content: key,
                },
              ],
            },
          ],
          usage: { input_tokens: 4, output_tokens: 3 },
        },
      },
      {
        provider: "gemini",
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
        header: "x-goog-api-key",
        body: {
          candidates: [
            {
              content: { parts: [{ text: "맑습니다" }] },
              groundingMetadata: {
                groundingChunks: [{ web: { uri: "https://example.com/weather", title: "공공 날씨 안내" } }],
              },
            },
          ],
          usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2, totalTokenCount: 5 },
        },
      },
    ];
    for (const row of cases) {
      let seen = null;
      const result = await runProviderWebSearch({
        provider: row.provider,
        apiKey: key,
        model: row.provider === "gemini" ? "gemini-3.6-flash" : "test-model",
        query: "오늘 날씨",
        fetchImpl: async (url, init) => {
          seen = { url, init };
          return jsonResponse(row.body);
        },
      });
      expect(seen.url).toBe(row.url);
      expect(seen.init.headers[row.header]).toContain(key);
      expect(result.ok).toBe(true);
      expect(result.results).toEqual([
        expect.objectContaining({ title: "공공 날씨 안내", url: "https://example.com/weather" }),
      ]);
      expect(JSON.stringify(result)).not.toContain(key);
      expect(JSON.stringify(seen.init.body)).toContain("오늘 날씨");
      expect(seen.url).not.toContain(key);
    }
  });

  test("a provider error does not echo the key", async () => {
    const key = "sk-test-secret-value";
    const result = await runProviderWebSearch({
      provider: "openai",
      apiKey: key,
      query: "오늘 날씨",
      fetchImpl: async () => jsonResponse({ error: { message: `bad ${key}` } }, 401),
    });
    expect(result).toEqual({ ok: false, error: "PROVIDER_ERROR", results: [] });
    expect(JSON.stringify(result)).not.toContain(key);
  });

  test("the daily limit stops the call before any fetch", async () => {
    let called = false;
    const result = await runAlterWebSearch({
      ctx: {
        academyId: "eval",
        user: { _id: "teacher", userId: "teacher1", userName: "김교사" },
        academy: { aiProvider: "openai", aiApiKey: "sk-test-secret-value" },
        fetchWeb: async () => {
          called = true;
          return jsonResponse({});
        },
      },
      query: "오늘 날씨",
      countToday: async () => 20,
    });
    expect(called).toBe(false);
    expect(result.error).toBe("LIMIT_REACHED");
  });
});
