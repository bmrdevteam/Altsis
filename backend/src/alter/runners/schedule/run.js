/**
 * Time-schedule runner. Caps, claim, and alterSchedule notification stay in
 * the schedule service. This call builds the input, applies the skill gate,
 * and runs the agent. It does not propose chat drafts.
 */

import { guardAlterAgent } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";
import { prepareGatedTurn } from "../skill/run.js";

export const runScheduleAgent = (args = {}) =>
  guardAlterAgent(() => {
    const turned = prepareGatedTurn({
      ...args,
      mode: "schedule",
      allowScheduleTool: false,
    });
    return runAlterAgent({ ...turned.prepared, skillGate: turned.skillGate });
  });
