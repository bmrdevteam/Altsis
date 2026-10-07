/**
 * Time-schedule runner. Caps, claim, and alterSchedule notification stay in
 * the schedule service. This call only builds the input and runs the agent.
 */

import { guardAlterAgent, prepareAlterAgentCall } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";

export const runScheduleAgent = (args = {}) =>
  guardAlterAgent(() =>
    runAlterAgent(
      prepareAlterAgentCall({
        ...args,
        mode: "schedule",
        allowScheduleTool: false,
      })
    )
  );
