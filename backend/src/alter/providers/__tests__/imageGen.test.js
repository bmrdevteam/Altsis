import { decodeImageBytes, runProviderImage } from "../imageGen.js";
import { IMAGE_BYTES_MAX } from "../../core/limits.js";

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

const PNG = Buffer.from("png-bytes").toString("base64");

describe("provider image generation", () => {
  test("a scripted key never calls the network", async () => {
    let called = false;
    const result = await runProviderImage({
      provider: "openai",
      apiKey: "scripted-local-dev",
      prompt: "막대 차트",
      fetchImpl: async () => {
        called = true;
        return jsonResponse({});
      },
    });
    expect(called).toBe(false);
    expect(result.scripted).toBe(true);
    expect(result.url).toBe("https://example.com/generated/chart.png");
    expect(result.usage.totalTokens).toBe(20);
  });

  test("openai stores bytes, gemini reads inline data, and anthropic is unsupported", async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push({ url, init });
      if (String(url).includes("openai")) {
        return jsonResponse({
          data: [{ b64_json: PNG }],
          usage: { input_tokens: 4, output_tokens: 6, total_tokens: 10 },
        });
      }
      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ inlineData: { mimeType: "image/png", data: PNG } }],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 5, totalTokenCount: 8 },
      });
    };
    const openai = await runProviderImage({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      prompt: "막대 차트",
      fetchImpl,
    });
    const gemini = await runProviderImage({
      provider: "gemini",
      apiKey: "gem-test-secret-value",
      prompt: "막대 차트",
      fetchImpl,
    });
    let anthropicCalled = false;
    const anthropic = await runProviderImage({
      provider: "anthropic",
      apiKey: "ant-test-secret-value",
      prompt: "막대 차트",
      fetchImpl: async () => {
        anthropicCalled = true;
        return jsonResponse({});
      },
    });
    expect(openai.ok).toBe(true);
    expect(openai.bytes.equals(Buffer.from("png-bytes"))).toBe(true);
    expect(openai.usage.totalTokens).toBe(10);
    expect(gemini.ok).toBe(true);
    expect(gemini.bytes.equals(Buffer.from("png-bytes"))).toBe(true);
    expect(anthropic).toEqual({ ok: false, error: "UNSUPPORTED" });
    expect(anthropicCalled).toBe(false);
    expect(seen[0].init.body).not.toContain("sk-test-secret-value");
    expect(seen[1].init.body).not.toContain("gem-test-secret-value");
    expect(String(seen[0].url)).not.toContain("sk-test-secret-value");
    expect(String(seen[1].url)).not.toContain("gem-test-secret-value");
    expect(seen[0].init.headers.authorization).toBe("Bearer sk-test-secret-value");
    expect(seen[0].init.body).toContain("1024x1024");
    expect(seen[1].init.headers["x-goog-api-key"]).toBe("gem-test-secret-value");
  });

  test("oversized bytes are rejected", () => {
    expect(decodeImageBytes("")).toBeNull();
    const huge = Buffer.alloc(IMAGE_BYTES_MAX + 1, 1).toString("base64");
    expect(decodeImageBytes(huge)).toBeNull();
  });
});
