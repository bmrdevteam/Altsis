/**
 * Chat runner. Builds the agent input and calls runAlterAgent in chat mode.
 * SSE delivery stays on the HTTP handler.
 */

import { guardAlterAgent } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";
import { prepareGatedTurn } from "../skill/run.js";

export const runChatAgent = (args = {}) =>
  guardAlterAgent(() => {
    const turned = prepareGatedTurn({ ...args, mode: "chat" });
    return runAlterAgent({ ...turned.prepared, skillGate: turned.skillGate });
  });
