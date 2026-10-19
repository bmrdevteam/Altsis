import { decodeImageBytes, runProviderImage } from "../imageGen.js";
import { localFileBucket, runAlterImage, storeGeneratedImage } from "../../../services/alterImage.js";
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

  test("provider errors keep status and code, and drop the message", async () => {
    const key = "sk-test-secret-value";
    const prompt = "막대 차트 010-1234-5678";
    const cases = [
      {
        status: 403,
        body: {
          error: {
            message: `no access to gpt-image-1 for ${key}. prompt ${prompt}`,
            type: "invalid_request_error",
            code: "model_not_found",
          },
        },
        expect: { ok: false, error: "PROVIDER_ERROR", status: 403, providerCode: "model_not_found" },
      },
      {
        status: 429,
        body: {
          error: {
            message: `slow down ${key}`,
            type: "rate_limit_error",
            code: "rate_limit_exceeded",
          },
        },
        expect: { ok: false, error: "PROVIDER_ERROR", status: 429, providerCode: "rate_limit_exceeded" },
      },
      {
        status: 400,
        body: {
          error: {
            message: `rejected ${prompt}`,
            type: "invalid_request_error",
            code: "content_policy_violation",
          },
        },
        expect: { ok: false, error: "PROVIDER_ERROR", status: 400, providerCode: "content_policy_violation" },
      },
      {
        status: 500,
        body: `upstream ${key}`,
        json: false,
        expect: { ok: false, error: "PROVIDER_ERROR", status: 500 },
      },
    ];
    for (const row of cases) {
      let calls = 0;
      const result = await runProviderImage({
        provider: "openai",
        apiKey: key,
        prompt,
        fetchImpl: async () => {
          calls += 1;
          return {
            ok: row.status < 400,
            status: row.status,
            text: async () => (row.json === false ? String(row.body) : JSON.stringify(row.body)),
          };
        },
      });
      expect(calls).toBe(1);
      expect(result).toEqual(row.expect);
      const packed = JSON.stringify(result);
      expect(packed).not.toContain(key);
      expect(packed).not.toContain("010-1234-5678");
      expect(packed).not.toContain("upstream");
      expect(packed).not.toContain("no access");
    }
  });

  test("a finished response without image bytes is not fetched again", async () => {
    const secret = "X-Amz-Signature-secretvalue";
    let calls = 0;
    const result = await runProviderImage({
      provider: "openai",
      apiKey: "sk-test-secret-value",
      prompt: "막대 차트",
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({
          data: [{ url: `https://cdn.example/img?${secret}` }],
        });
      },
    });
    expect(calls).toBe(1);
    expect(result).toEqual({ ok: false, error: "PROVIDER_ERROR", status: 200, providerCode: "url_only" });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  test("a scripted image is returned without storage", async () => {
    let stored = false;
    const result = await runAlterImage({
      ctx: {
        academy: { aiProvider: "openai", aiApiKey: "scripted-local-dev" },
        fetchImage: async () => {
          throw new Error("network");
        },
      },
      prompt: "막대 차트",
      storeImage: async () => {
        stored = true;
        return { ok: false, error: "STORAGE_ERROR" };
      },
    });
    expect(stored).toBe(false);
    expect(result.scripted).toBe(true);
    expect(result.url).toBe("https://example.com/generated/chart.png");
  });

  test("a local placeholder bucket is a storage failure, not another provider call", async () => {
    const previousBucket = process.env.s3_bucket2;
    const previousKey = process.env.s3_accessKeyId2;
    const previousEndpoint = process.env.s3_endpoint2;
    const png = { academyId: "eval", userId: "teacher", bytes: Buffer.from("png"), mimeType: "image/png" };
    let calls = 0;
    try {
      process.env.s3_bucket2 = "test-bucket-2";
      process.env.s3_accessKeyId2 = "real-looking-key";
      delete process.env.s3_endpoint2;
      expect(localFileBucket()).toBe(true);
      expect(localFileBucket("test-bucket-2", "test-access-key-2", "http://127.0.0.1:9000")).toBe(false);
      expect(localFileBucket("local-files", "test-access-key-2", "  ")).toBe(true);
      expect(await storeGeneratedImage(png)).toEqual({
        ok: false,
        error: "STORAGE_ERROR",
        providerCode: "local_bucket",
      });
      process.env.s3_bucket2 = "local-files";
      expect((await storeGeneratedImage(png)).providerCode).toBe("local_bucket");
      process.env.s3_bucket2 = "altsis-files";
      process.env.s3_accessKeyId2 = "test-access-key-2";
      expect((await storeGeneratedImage(png)).providerCode).toBe("local_bucket");
      process.env.s3_accessKeyId2 = "real-looking-key";
      expect(await storeGeneratedImage({ bytes: png.bytes, mimeType: png.mimeType })).toEqual({
        ok: false,
        error: "STORAGE_ERROR",
        providerCode: "missing_owner",
      });
      process.env.s3_bucket2 = "test-bucket-2";
      const result = await runAlterImage({
        ctx: {
          academy: { aiProvider: "openai", aiApiKey: "sk-test-secret-value" },
          fetchImage: async () => {
            calls += 1;
            return jsonResponse({
              data: [{ b64_json: PNG }],
              usage: { input_tokens: 20, output_tokens: 274, total_tokens: 294 },
            });
          },
        },
        prompt: "막대 차트",
      });
      expect(calls).toBe(1);
      expect(result.error).toBe("STORAGE_ERROR");
      expect(result.providerCode).toBe("local_bucket");
      expect(result.usage.totalTokens).toBe(294);
      expect(JSON.stringify(result)).not.toContain("sk-test-secret-value");
    } finally {
      process.env.s3_bucket2 = previousBucket;
      process.env.s3_accessKeyId2 = previousKey;
      if (previousEndpoint == null) delete process.env.s3_endpoint2;
      else process.env.s3_endpoint2 = previousEndpoint;
    }
  });

  test("a storage failure stays distinct and does not call the provider twice", async () => {
    const PNG = Buffer.from("png-bytes").toString("base64");
    let calls = 0;
    const err = new Error("The request signature we calculated does not match sk-test-secret-value");
    err.code = "InvalidAccessKeyId";
    const result = await runAlterImage({
      ctx: {
        academy: { aiProvider: "openai", aiApiKey: "sk-test-secret-value" },
        fetchImage: async () => {
          calls += 1;
          return jsonResponse({
            data: [{ b64_json: PNG }],
            usage: { input_tokens: 20, output_tokens: 80, total_tokens: 100 },
          });
        },
      },
      prompt: "막대 차트",
      storeImage: async () => {
        throw err;
      },
    });
    expect(calls).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("STORAGE_ERROR");
    expect(result.providerCode).toBe("InvalidAccessKeyId");
    expect(result.usage.totalTokens).toBe(100);
    expect(JSON.stringify(result)).not.toContain("sk-test-secret-value");
    expect(JSON.stringify(result)).not.toContain("signature");
  });

  test("oversized bytes are rejected", () => {
    expect(decodeImageBytes("")).toBeNull();
    const huge = Buffer.alloc(IMAGE_BYTES_MAX + 1, 1).toString("base64");
    expect(decodeImageBytes(huge)).toBeNull();
  });
});
