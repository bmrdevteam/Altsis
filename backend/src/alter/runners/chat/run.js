/**
 * Chat runner. Builds the agent input and calls runAlterAgent in chat mode.
 * SSE delivery stays on the HTTP handler.
 */

import { guardAlterAgent, prepareAlterAgentCall } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";

export const runChatAgent = (args = {}) =>
  guardAlterAgent(() =>
    runAlterAgent(prepareAlterAgentCall({ ...args, mode: "chat" }))
  );
