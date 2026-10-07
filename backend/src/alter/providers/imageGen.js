/**
 * One-shot image generation for the academy's configured provider.
 * The scripted stand-in never calls the network. Keys stay in the request
 * header and are not copied into errors or logs.
 */

import { IMAGE_BYTES_MAX, IMAGE_SIZE } from "../core/limits.js";
import { isScriptedDemoKey } from "./scripted.js";
import { normalizeUsage } from "./usage.js";

export const SCRIPTED_IMAGE_URL = "https://example.com/generated/chart.png";
export const SCRIPTED_IMAGE_ALT = "생성된 차트";

const OPENAI_IMAGE_MODEL = "gpt-image-1";
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

const failed = (error = "PROVIDER_ERROR") => ({ ok: false, error });

const clip = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

export const decodeImageBytes = (b64) => {
  const raw = String(b64 || "").trim();
  if (!raw || raw.length > IMAGE_BYTES_MAX * 2) return null;
  const bytes = Buffer.from(raw, "base64");
  if (!bytes.length || bytes.length > IMAGE_BYTES_MAX) return null;
  return bytes;
};

const postJson = async (fetchImpl, url, { headers, body }) => {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = null;
  }
  if (!response.ok || !json) {
    const err = new Error("image generation failed");
    err.status = response.status;
    throw err;
  }
  return json;
};

const fromBytes = (b64, mimeType, usage, alt) => {
  const bytes = decodeImageBytes(b64);
  if (!bytes) return failed("SIZE_CAP");
  return {
    ok: true,
    mimeType: mimeType || "image/png",
    bytes,
    alt,
    usage: normalizeUsage(usage),
  };
};

const generateOpenAI = async ({ apiKey, prompt, alt, fetchImpl }) => {
  const json = await postJson(fetchImpl, "https://api.openai.com/v1/images/generations", {
    headers: { authorization: `Bearer ${apiKey}` },
    body: {
      model: OPENAI_IMAGE_MODEL,
      prompt,
      n: 1,
      size: IMAGE_SIZE,
      output_format: "png",
    },
  });
  const row = Array.isArray(json?.data) ? json.data[0] : null;
  if (!row?.b64_json) return failed();
  return fromBytes(row.b64_json, "image/png", json?.usage, alt);
};

const generateGemini = async ({ apiKey, prompt, alt, fetchImpl }) => {
  const name = encodeURIComponent(GEMINI_IMAGE_MODEL);
  const json = await postJson(
    fetchImpl,
    `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent`,
    {
      headers: { "x-goog-api-key": apiKey },
      body: {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      },
    }
  );
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const image = parts.find((part) => part?.inlineData?.data || part?.inline_data?.data);
  const b64 = image?.inlineData?.data || image?.inline_data?.data;
  const mimeType = image?.inlineData?.mimeType || image?.inline_data?.mime_type || "image/png";
  if (!b64) return failed();
  return fromBytes(b64, mimeType, json?.usageMetadata, alt);
};

const GENERATORS = {
  openai: generateOpenAI,
  gemini: generateGemini,
};

export const scriptedImage = (alt) => ({
  ok: true,
  scripted: true,
  url: SCRIPTED_IMAGE_URL,
  alt: alt || SCRIPTED_IMAGE_ALT,
  mimeType: "image/png",
  usage: { promptTokens: 12, candidatesTokens: 8, thoughtsTokens: 0, totalTokens: 20 },
});

/**
 * @param {{ provider?: string, apiKey?: string, prompt: string, alt?: string, fetchImpl?: Function }} req
 */
export const runProviderImage = async ({
  provider,
  apiKey,
  prompt,
  alt,
  fetchImpl = fetch,
} = {}) => {
  const caption = clip(alt || prompt, 80) || SCRIPTED_IMAGE_ALT;
  if (isScriptedDemoKey(apiKey) || provider === "scripted" || !apiKey) {
    return scriptedImage(caption);
  }
  const generate = GENERATORS[String(provider || "").trim()];
  if (!generate) return failed("UNSUPPORTED");
  try {
    return await generate({ apiKey, prompt, alt: caption, fetchImpl });
  } catch (_) {
    return failed();
  }
};
