import {
  toOpenAIContent,
  toAnthropicContent,
  toGeminiParts,
  openaiBuildBody,
  geminiBuildBody,
  anthropicBuildBody,
} from "../../src/services/aiProvider.js";

describe("aiProvider multimodal content", () => {
  const parts = [
    { type: "text", text: "이 사진을 설명해 주세요" },
    {
      type: "image",
      mimeType: "image/png",
      data: "aaaBBB",
    },
  ];

  test("toOpenAIContent maps image parts to image_url", () => {
    const content = toOpenAIContent(parts);
    expect(content).toEqual([
      { type: "text", text: "이 사진을 설명해 주세요" },
      {
        type: "image_url",
        image_url: { url: "data:image/png;base64,aaaBBB" },
      },
    ]);
  });

  test("toAnthropicContent maps image parts to base64 source", () => {
    const content = toAnthropicContent(parts);
    expect(content).toEqual([
      { type: "text", text: "이 사진을 설명해 주세요" },
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: "aaaBBB",
        },
      },
    ]);
  });

  test("toGeminiParts maps image parts to inlineData", () => {
    const geminiParts = toGeminiParts(parts);
    expect(geminiParts).toEqual([
      { text: "이 사진을 설명해 주세요" },
      { inlineData: { mimeType: "image/png", data: "aaaBBB" } },
    ]);
  });

  test("openaiBuildBody includes multimodal user content", () => {
    const body = openaiBuildBody({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: parts }],
    });
    expect(body.messages[0].content[1].type).toBe("image_url");
  });

  test("geminiBuildBody includes inlineData parts", () => {
    const body = geminiBuildBody({
      messages: [{ role: "user", content: parts }],
    });
    expect(body.contents[0].parts[1].inlineData.data).toBe("aaaBBB");
  });

  test("anthropicBuildBody includes image blocks", () => {
    const body = anthropicBuildBody({
      model: "claude-3-5-sonnet-latest",
      messages: [{ role: "user", content: parts }],
    });
    expect(body.messages[0].content[1].type).toBe("image");
  });
});
