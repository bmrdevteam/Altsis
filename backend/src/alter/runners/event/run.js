/**
 * Event runner. Debounce, daily caps, loop prevention, and alterTrigger
 * notification stay in the schedule service. This call only sets event mode.
 */

import { guardAlterAgent, prepareAlterAgentCall } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";

export const runEventAgent = (args = {}) =>
  guardAlterAgent(() =>
    runAlterAgent(
      prepareAlterAgentCall({
        ...args,
        mode: "event",
        allowScheduleTool: false,
      })
    )
  );
