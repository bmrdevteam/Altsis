/**
 * A selected draft chip stays on that skill.
 * Web search, image generation, and any other draft are refused before they run.
 */

import { logger } from "../../log/logger.js";
import { asksPublicWeb } from "../../services/alterChatWeb.js";
import { getCapability } from "../skills/catalog.js";
import { recordSkillAudit } from "../skills/auditPort.js";
import { matchDispatchIntent } from "../skills/intent.js";

const OPEN_CHIPS = new Set(["", "chat", "agent", "search"]);

const chipSentence = (title) => {
  const name = String(title || "선택한").trim() || "선택한";
  return `지금은 '${name}' 스킬로 제한된 대화라 이 기능은 실행하지 않았습니다. 칩을 해제하거나 다른 칩을 선택해 주세요.`;
};

/**
 * @returns {Promise<{ text: string, reasonCode: string, blocked: string } | null>}
 */
export const lockedChipRefusal = async ({
  skillId,
  message,
  academyId,
  userId,
  role,
} = {}) => {
  const id = String(skillId || "").trim();
  if (!id || OPEN_CHIPS.has(id)) return null;
  const capability = getCapability(id);
  if (!capability || capability.channel !== "dispatch") return null;
  const text = String(message || "");
  const intent = matchDispatchIntent(text);
  if (intent === id) return null;
  let blocked = "";
  if (asksPublicWeb(text)) blocked = "web_search";
  else if (intent === "generate_image") blocked = "generate_image";
  else if (intent) blocked = intent;
  if (!blocked) return null;
  const sentence = chipSentence(capability.title);
  logger.info(`alter chip scope deny chip=${id} blocked=${blocked} reason=CHIP_SCOPE`);
  await recordSkillAudit({
    academyId,
    userId: String(userId || ""),
    role: role || "",
    skillId: blocked,
    kind: blocked === "web_search" ? "read" : "draft",
    decision: "deny",
    reasonCode: "CHIP_SCOPE",
    query: text,
  });
  return { text: sentence, reasonCode: "CHIP_SCOPE", blocked };
};
