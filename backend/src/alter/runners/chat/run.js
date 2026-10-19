/**
 * Chat runner. Builds the agent input and calls runAlterAgent in chat mode.
 * SSE delivery stays on the HTTP handler.
 */

import { guardAlterAgent } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";
import { dispatchSkillForMessage } from "../../skills/intent.js";
import { dispatchTurn } from "../../skills/dispatch.js";
import { prepareGatedTurn } from "../skill/run.js";

const idleResult = (text, extra = {}) => ({
  text: text || "확인한 내용이 없습니다.",
  links: [],
  images: [],
  proposals: [],
  scheduleProposal: null,
  toolNames: extra.toolNames || [],
  toolSteps: extra.toolSteps || 0,
  tokenUsage: null,
  usage: null,
  trace: [],
  draft: extra.draft || null,
  images: extra.images || [],
  confirmation: extra.confirmation || null,
});

export const runChatAgent = (args = {}) =>
  guardAlterAgent(async () => {
    const turned = prepareGatedTurn({ ...args, mode: "chat" });
    const message = turned.prepared.input.message;
    const intent = dispatchSkillForMessage(message, turned.skillGate.chip);
    if (intent) {
      const dispatched = await dispatchTurn({
        skillId: intent,
        request: message,
        skillGate: turned.skillGate,
        ctx: turned.prepared.ctx,
      });
      return idleResult(dispatched.text, {
        toolNames: dispatched.executed ? ["use_skill"] : [],
        toolSteps: dispatched.executed ? 1 : 0,
        draft: dispatched.draft,
        images: dispatched.images,
        confirmation: dispatched.confirmation,
      });
    }
    return runAlterAgent({ ...turned.prepared, skillGate: turned.skillGate });
  });
