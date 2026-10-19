/**
 * What a dispatch skill may do on this turn.
 * A low-cost draft with no chip waits for the proposal card.
 * That card is the pre-execute confirmation. A chosen chip skips it.
 * High-cost and write skills still confirm before they run.
 */

import { resolveSkillMeta } from "../core/skillMeta.js";
import { evaluateSkillAccess } from "./skillGate.js";

const OPEN_CHIPS = new Set(["", "chat", "agent"]);

const costly = (meta) =>
  meta.confirmation === "both" || meta.kind === "write" || meta.costTier === "high";

/**
 * @param {{ actor?: object, flags?: object, chip?: object|null, capability?: object }} input
 */
export const planDispatch = ({ actor, flags, chip, capability } = {}) => {
  const access = evaluateSkillAccess({
    actor,
    flags,
    chip,
    capability,
    phase: "list",
  });
  if (access.decision !== "allow") return { ...access, executeNow: false, stage: null };
  const meta = resolveSkillMeta(capability || {});
  const chipId = String(chip?.id || "");
  const locked = Boolean(chipId) && !OPEN_CHIPS.has(chipId);
  const chosen = locked && chipId === meta.id;
  if (costly(meta)) {
    return {
      decision: "needs_confirmation",
      reasonCode: "CONFIRMATION_REQUIRED",
      userMessage: "",
      nextAction: "confirm",
      stage: chosen ? "before_execute" : "propose_execute",
      executeNow: false,
    };
  }
  if (!chosen) {
    return {
      decision: "needs_confirmation",
      reasonCode: "CONFIRMATION_REQUIRED",
      userMessage: "",
      nextAction: "confirm",
      stage: "propose",
      executeNow: false,
    };
  }
  return {
    decision: "allow",
    reasonCode: "ALLOW",
    userMessage: "",
    nextAction: null,
    stage: "execute",
    executeNow: true,
  };
};
