/**
 * Eval proof that image generation stays off by default, refuses a real
 * person, strips contact data, and a scripted key returns one image URL.
 */

import { IMAGE_DAILY_LIMIT } from "../core/limits.js";
import { createAgentTools } from "./registry.js";

const SCRIPTED_IMAGE_URL = "https://example.com/generated/chart.png";

const PHONE = "010-1234-5678";
const EMAIL = "teacher@example.com";

export const runImageGenCheck = async () => {
  const offered = createAgentTools().map((tool) => tool.name);
  const tool = createAgentTools({
    imageGenEnabled: true,
    includeScheduleTool: false,
  }).find((item) => item.name === "generate_image");
  const calls = [];
  const generateImage = async ({ prompt }) => {
    calls.push(prompt);
    return {
      ok: true,
      url: SCRIPTED_IMAGE_URL,
      alt: "생성된 차트",
      usage: { promptTokens: 12, candidatesTokens: 8, thoughtsTokens: 0, totalTokens: 20 },
    };
  };
  const base = {
    academyId: "eval",
    academy: { imageGenEnabled: true, aiEnabled: true },
    user: { _id: "teacher", auth: "member" },
    registration: { role: "teacher" },
    generateImage,
    countImageGens: async () => 0,
  };
  const off = await tool.execute(
    {
      academy: { imageGenEnabled: false, aiEnabled: true },
      user: base.user,
      registration: base.registration,
      generateImage,
    },
    { prompt: "막대 차트" }
  );
  const person = await tool.execute(
    base,
    { prompt: "실존 학생의 얼굴 사진을 그려 줘" }
  );
  const limited = await tool.execute(
    { ...base, countImageGens: async () => IMAGE_DAILY_LIMIT },
    { prompt: "막대 차트" }
  );
  const made = await tool.execute(
    base,
    { prompt: `홍길동 ${PHONE} ${EMAIL} 막대 차트` }
  );
  const packed = JSON.stringify({ off, person, limited, made, calls });
  const query = calls.join(" ");
  const leaked =
    offered.includes("generate_image") ||
    calls.length !== 1 ||
    packed.includes(PHONE) ||
    packed.includes(EMAIL) ||
    person?.images?.length ||
    off?.error !== "FORBIDDEN" ||
    limited?.error !== "LIMIT_REACHED" ||
    made?.images?.[0]?.url !== SCRIPTED_IMAGE_URL ||
    query.includes("010") ||
    query.includes("@");
  if (leaked || !query.includes("막대 차트")) {
    return { text: "유출", toolNames: ["generate_image"] };
  }
  return {
    text: "이미지 생성은 기본으로 꺼져 있습니다. 실존하는 학생이나 사람의 이미지는 만들지 않습니다. 개인정보를 뺀 설명으로 만들었습니다. LIMIT_REACHED",
    toolNames: ["generate_image"],
  };
};
