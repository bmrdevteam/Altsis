import { runAlterWebSearch } from "../../../services/alterWebSearch.js";
import { runProviderWebSearch } from "../webSearch.js";

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

  test("a reasoning model asks for sources with a low effort and a higher output cap", async () => {
    let body = null;
    await runProviderWebSearch({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      model: "gpt-5.6-luna",
      query: "오늘 날씨",
      fetchImpl: async (_url, init) => {
        body = JSON.parse(init.body);
        return jsonResponse({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "오늘은 맑습니다. 출처는 공공 날씨 안내입니다.",
                  annotations: [
                    {
                      type: "url_citation",
                      url: "https://example.com/weather",
                      title: "공공 날씨 안내",
                      start_index: 14,
                      end_index: 19,
                    },
                  ],
                },
              ],
            },
          ],
          usage: { input_tokens: 40, output_tokens: 20, total_tokens: 60 },
        });
      },
    }).then((result) => {
      expect(body.reasoning).toEqual({ effort: "low" });
      expect(body.max_output_tokens).toBe(4096);
      expect(body.tools[0].search_context_size).toBe("low");
      expect(body.input).toContain("출처");
      expect(result.results[0]).toMatchObject({
        title: "공공 날씨 안내",
        url: "https://example.com/weather",
        snippet: "공공 날씨",
      });
    });
  });

  test("an incomplete search with no citations is a tool error and keeps the key out", async () => {
    const key = "sk-test-secret-value";
    const result = await runProviderWebSearch({
      provider: "openai",
      apiKey: key,
      model: "gpt-5.6-luna",
      query: "오늘 날씨",
      fetchImpl: async () =>
        jsonResponse({
          status: "incomplete",
          output: [{ type: "reasoning" }],
          usage: { input_tokens: 28000, output_tokens: 800, total_tokens: 28800 },
        }),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("TOOL_ERROR");
    expect(result.results).toEqual([]);
    expect(result.usage.totalTokens).toBe(28800);
    expect(JSON.stringify(result)).not.toContain(key);
  });

  test("anthropic and gemini unfinished searches with no hits are tool errors", async () => {
    const blob = "B".repeat(12000);
    const cases = [
      {
        provider: "anthropic",
        body: {
          stop_reason: "max_tokens",
          content: [{ type: "text", text: blob }],
          usage: { input_tokens: 20000, output_tokens: 4096 },
        },
        expectBody: (parsed) => {
          expect(parsed.max_tokens).toBe(4096);
          expect(parsed.reasoning).toBeUndefined();
        },
      },
      {
        provider: "gemini",
        model: "gemini-3.6-flash",
        body: {
          candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: blob }] } }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 4096, totalTokenCount: 20000 },
        },
        expectBody: (parsed) => {
          expect(parsed.generationConfig.maxOutputTokens).toBe(4096);
        },
      },
    ];
    for (const row of cases) {
      let parsed = null;
      const result = await runProviderWebSearch({
        provider: row.provider,
        apiKey: "sk-test-secret-value",
        model: row.model,
        query: "오늘 날씨",
        fetchImpl: async (_url, init) => {
          parsed = JSON.parse(init.body);
          return jsonResponse(row.body);
        },
      });
      row.expectBody(parsed);
      expect(JSON.stringify(parsed).length).toBeLessThan(500);
      expect(result.ok).toBe(false);
      expect(result.error).toBe("TOOL_ERROR");
      expect(result.results).toEqual([]);
      expect(result.usage.totalTokens).toBeGreaterThan(15000);
      expect(JSON.stringify(result)).not.toContain(blob.slice(0, 40));
      expect(JSON.stringify(result)).not.toContain("sk-test-secret-value");
    }
  });

  test("a finished search over the token budget with no hits is a tool error", async () => {
    const result = await runProviderWebSearch({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      model: "gpt-4o-mini",
      query: "오늘 날씨",
      fetchImpl: async () =>
        jsonResponse({
          status: "completed",
          output: [],
          usage: { input_tokens: 14000, output_tokens: 1001, total_tokens: 15001 },
        }),
    });
    expect(result).toMatchObject({ ok: false, error: "TOOL_ERROR", results: [] });
    expect(result.usage.totalTokens).toBe(15001);
  });

  test("an unfinished search keeps a short citation and drops the rest of the body", async () => {
    const blob = "B".repeat(30000);
    const text = `맑음 ${blob}`;
    const result = await runProviderWebSearch({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      model: "gpt-5.6-luna",
      query: "오늘 날씨",
      fetchImpl: async () =>
        jsonResponse({
          status: "incomplete",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text,
                  annotations: [
                    {
                      type: "url_citation",
                      url: "https://example.com/weather",
                      title: "공공 날씨 안내",
                      start_index: 0,
                      end_index: 2,
                    },
                  ],
                },
              ],
            },
          ],
          usage: { input_tokens: 20000, output_tokens: 4000, total_tokens: 24000 },
        }),
    });
    expect(result.ok).toBe(true);
    expect(result.results).toEqual([
      { title: "공공 날씨 안내", url: "https://example.com/weather", snippet: "맑음" },
    ]);
    expect(result.usage.totalTokens).toBe(24000);
    expect(JSON.stringify(result).length).toBeLessThan(500);
    expect(JSON.stringify(result)).not.toContain(blob.slice(0, 40));
  });

  test("untitled search sources stay even when the message says there are none", async () => {
    let body = null;
    const result = await runProviderWebSearch({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      model: "gpt-4o-mini",
      query: "오늘 공공 날씨",
      fetchImpl: async (_url, init) => {
        body = JSON.parse(init.body);
        return jsonResponse({
          status: "completed",
          output: [
            {
              type: "web_search_call",
              status: "completed",
              action: {
                type: "search",
                sources: [
                  { type: "url", url: "https://www.random.org/weather" },
                  { type: "url", url: "https://randombasis.com/guide" },
                  { type: "api", name: "oai-weather" },
                ],
              },
            },
            {
              type: "message",
              content: [{ type: "output_text", text: "검색 결과가 없습니다.", annotations: [] }],
            },
          ],
          usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 },
        });
      },
    });
    expect(body.include).toEqual(["web_search_call.action.sources"]);
    expect(result.ok).toBe(true);
    expect(result.results).toEqual([
      { title: "random.org", url: "https://www.random.org/weather", snippet: "" },
      { title: "randombasis.com", url: "https://randombasis.com/guide", snippet: "" },
    ]);
    expect(JSON.stringify(result)).not.toContain("검색 결과가 없습니다");
  });

  test("mixed, duplicate, blank, and empty source lists keep only usable https rows", async () => {
    const longUrl = `https://example.com/${"b".repeat(500)}`;
    const mixed = await runProviderWebSearch({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      model: "gpt-4o-mini",
      query: "오늘 날씨",
      fetchImpl: async () =>
        jsonResponse({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "맑음입니다. 본문 속 https://example.com/secret 는 출처가 아닙니다.",
                  annotations: [
                    {
                      type: "url_citation",
                      url: "https://example.com/a",
                      title: "안내",
                      start_index: 0,
                      end_index: 2,
                    },
                  ],
                },
              ],
            },
            {
              type: "web_search_call",
              action: {
                type: "search",
                sources: [
                  { type: "url", url: "https://example.com/a", title: "다른제목" },
                  { type: "url", url: "https://example.com/a" },
                  { type: "url", url: "http://example.com/no" },
                  { type: "url", url: longUrl },
                  { type: "url", url: "https://example.com/b", title: "   " },
                  { type: "url", url: "not-a-url" },
                  { type: "url", url: "https://example.com/c" },
                  { type: "url", url: "https://example.com/d" },
                  { type: "url", url: "https://example.com/e" },
                  { type: "url", url: "https://example.com/f" },
                ],
              },
            },
          ],
          usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14 },
        }),
    });
    expect(mixed.ok).toBe(true);
    expect(mixed.results).toEqual([
      { title: "안내", url: "https://example.com/a", snippet: "맑음" },
      { title: "example.com", url: "https://example.com/b", snippet: "" },
      { title: "example.com", url: "https://example.com/c", snippet: "" },
      { title: "example.com", url: "https://example.com/d", snippet: "" },
      { title: "example.com", url: "https://example.com/e", snippet: "" },
    ]);
    expect(JSON.stringify(mixed)).not.toContain("secret");
    expect(JSON.stringify(mixed)).not.toContain("http://");

    const empty = await runProviderWebSearch({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      query: "오늘 날씨",
      fetchImpl: async () =>
        jsonResponse({
          status: "completed",
          output: [
            { type: "web_search_call", action: { type: "search", sources: [] } },
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: "see https://example.com/secret",
                  annotations: [],
                },
              ],
            },
          ],
          usage: { input_tokens: 14000, output_tokens: 1000, total_tokens: 15000 },
        }),
    });
    expect(empty).toMatchObject({ ok: true, results: [] });
    expect(empty.usage.totalTokens).toBe(15000);
    expect(JSON.stringify(empty)).not.toContain("secret");
  });

  test("the token budget keeps a citation and rejects an empty overrun", async () => {
    const kept = await runProviderWebSearch({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      query: "오늘 날씨",
      fetchImpl: async () =>
        jsonResponse({
          status: "completed",
          output: [
            {
              type: "web_search_call",
              action: { type: "search", sources: [{ type: "url", url: "https://example.com/a" }] },
            },
          ],
          usage: { input_tokens: 14000, output_tokens: 1001, total_tokens: 15001 },
        }),
    });
    expect(kept.ok).toBe(true);
    expect(kept.results).toEqual([{ title: "example.com", url: "https://example.com/a", snippet: "" }]);
    expect(kept.usage.totalTokens).toBe(15001);

    const httpOnly = await runProviderWebSearch({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      query: "오늘 날씨",
      fetchImpl: async () =>
        jsonResponse({
          status: "incomplete",
          output: [
            {
              type: "web_search_call",
              action: { type: "search", sources: [{ type: "url", url: "http://example.com/a" }] },
            },
          ],
          usage: { input_tokens: 20, output_tokens: 4, total_tokens: 24 },
        }),
    });
    expect(httpOnly).toMatchObject({ ok: false, error: "TOOL_ERROR", results: [] });
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
