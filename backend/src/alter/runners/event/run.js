/**
 * Event runner. Debounce, daily caps, loop prevention, and alterTrigger
 * notification stay in the schedule service. This call sets event mode and
 * the same skill gate as chat. It does not propose chat drafts.
 */

import { guardAlterAgent } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";
import { prepareGatedTurn } from "../skill/run.js";

export const runEventAgent = (args = {}) =>
  guardAlterAgent(() => {
    const turned = prepareGatedTurn({
      ...args,
      mode: "event",
      allowScheduleTool: false,
    });
    return runAlterAgent({ ...turned.prepared, skillGate: turned.skillGate });
  });
