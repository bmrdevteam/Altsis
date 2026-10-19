/**
 * Narrow phrases that mean a draft skill, before the model is asked.
 * Submission and activity wording stay on the read tools.
 */

export const matchDispatchIntent = (message) => {
  const text = String(message || "").trim();
  if (!text) return null;
  const formShape =
    (/(시간표|강의계획서|출력)\s*양식/.test(text) && /(만들|작성|초안|다듬)/.test(text)) ||
    (/양식\s*(초안|을|를)?\s*(만들|작성|다듬)/.test(text) && !/활동|미제출|제출/.test(text));
  if (formShape) return "form-draft";
  return null;
};

const OPEN_CHIPS = new Set(["", "chat", "agent"]);

/** A locked chip for another skill does not switch. */
export const dispatchSkillForMessage = (message, chip) => {
  const intent = matchDispatchIntent(message);
  if (!intent) return null;
  const chipId = String(chip?.id || "");
  if (chipId && !OPEN_CHIPS.has(chipId) && chipId !== intent) return null;
  return intent;
};
