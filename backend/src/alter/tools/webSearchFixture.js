/**
 * Eval proof that web search stays off by default and the outgoing query
 * drops contact data. The search function is injected, so this does not
 * call a provider.
 */

import { createAgentTools } from "./registry.js";

const PHONE = "010-1234-5678";
const EMAIL = "teacher@example.com";
const SNIPPET_PHONE = "010-9999-0000";

export const runWebSearchCheck = async () => {
  const offered = createAgentTools().map((tool) => tool.name);
  const tool = createAgentTools({
    webSearchEnabled: true,
    includeScheduleTool: false,
  }).find((item) => item.name === "web_search");
  let calledWhileOff = false;
  const seen = [];
  const off = await tool.execute(
    {
      academy: { webSearchEnabled: false, aiEnabled: true },
      user: { _id: "teacher", auth: "member" },
      registration: { role: "teacher" },
      searchWeb: async () => {
        calledWhileOff = true;
        return { ok: true, results: [] };
      },
    },
    { query: "오늘 날씨" }
  );
  const result = await tool.execute(
    {
      academy: { webSearchEnabled: true, aiEnabled: true },
      user: { _id: "teacher", auth: "member" },
      registration: { role: "teacher" },
      searchWeb: async ({ query }) => {
        seen.push(query);
        return {
          ok: true,
          results: [
            {
              title: "공공 날씨 안내",
              url: "https://example.com/weather",
              snippet: `맑음 ${SNIPPET_PHONE}`,
            },
          ],
        };
      },
    },
    { query: `홍길동 ${PHONE} ${EMAIL} 오늘 날씨` }
  );
  const packed = JSON.stringify({ off, result, seen });
  const query = seen[0] || "";
  const leaked =
    offered.includes("web_search") ||
    calledWhileOff ||
    packed.includes(PHONE) ||
    packed.includes(EMAIL) ||
    packed.includes(SNIPPET_PHONE) ||
    query.includes("010") ||
    query.includes("@");
  if (leaked || !packed.includes("[연락처]") || !query.includes("오늘 날씨")) {
    return { text: "유출", toolNames: ["web_search"] };
  }
  return {
    text: "웹 검색은 기본으로 꺼져 있습니다. 개인정보를 뺀 검색어로 찾았습니다.",
    toolNames: ["web_search"],
  };
};
