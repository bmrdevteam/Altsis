/**
 * Local demo replies for web search and image generation.
 * A scripted plan still wins. These phrases never call the network.
 * The query and the picture prompt are fixed public text, not the user's words.
 */

const USAGE = {
  promptTokens: 8,
  candidatesTokens: 24,
  thoughtsTokens: 0,
  totalTokens: 32,
};

const WEB_QUERY = "오늘 공공 날씨";
const IMAGE_PROMPT = "출석 비율 막대 차트";

const asksPublicWeb = (text) => /웹|날씨|뉴스/.test(text);
const asksPicture = (text) => /그림|차트|이미지/.test(text);

const namesOf = (tools) =>
  new Set((Array.isArray(tools) ? tools : []).map((tool) => tool?.name).filter(Boolean));

const finalTurn = (native, text) => {
  if (native) return { text, toolCalls: [], tokenUsage: { ...USAGE } };
  return {
    text: ["```alter", JSON.stringify({ type: "final", text }), "```"].join("\n"),
    tokenUsage: { ...USAGE },
  };
};

const callTurn = (native, name, args) => {
  if (native) {
    return {
      text: "",
      toolCalls: [{ id: `scripted-call-${name}`, name, arguments: args }],
      tokenUsage: { ...USAGE },
    };
  }
  return {
    text: ["```alter", JSON.stringify({ type: "tool", name, arguments: args }), "```"].join("\n"),
    tokenUsage: { ...USAGE },
  };
};

/**
 * @returns {object|null} A scripted turn, or null to keep the default to-do reply.
 */
export const scriptedCapabilityTurn = ({
  native,
  tools,
  userText,
  systemInstruction,
  sawResult,
  toolChoice,
  busy = false,
} = {}) => {
  if (busy) return null;
  const text = String(userText || "");
  const listed = namesOf(tools);
  const web = asksPublicWeb(text);
  const picture = !web && asksPicture(text);
  if (!web && !picture) return null;
  const calling = !sawResult && toolChoice !== "none";
  if (web) {
    if (!listed.has("web_search")) {
      return finalTurn(
        native,
        "웹 검색은 꺼져 있습니다. 학원 소유자가 AI 설정에서 켤 수 있습니다."
      );
    }
    if (calling) return callTurn(native, "web_search", { query: WEB_QUERY });
    return finalTurn(native, "공공 날씨 안내에 따르면 오늘은 맑습니다.");
  }
  if (!listed.has("generate_image")) {
    const blocked = /예약과 이벤트에서는 이미지를 만들지 않습니다/.test(String(systemInstruction || ""));
    return finalTurn(
      native,
      blocked
        ? "예약과 이벤트에서는 이미지를 만들지 않습니다."
        : "이미지 생성은 꺼져 있습니다. 학원 소유자가 AI 설정에서 켤 수 있습니다."
    );
  }
  if (calling) return callTurn(native, "generate_image", { prompt: IMAGE_PROMPT });
  return finalTurn(native, "생성된 차트입니다.");
};
