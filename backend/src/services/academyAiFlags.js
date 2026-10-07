/**
 * Owner-only academy AI toggles. A flag-only body must not flip aiEnabled.
 */

export const applyAcademyAiFlags = (academy, body = {}, { owner = false } = {}) => {
  const eventFlag = body.alterEventTriggersEnabled;
  const webFlag = body.webSearchEnabled;
  const imageFlag = body.imageGenEnabled;
  if (!owner) {
    if (
      typeof eventFlag !== "boolean" ||
      "aiEnabled" in body ||
      "webSearchEnabled" in body ||
      "imageGenEnabled" in body
    ) {
      return { status: 403, message: "권한이 없습니다." };
    }
    academy.alterEventTriggersEnabled = eventFlag;
    return { ok: true, eventOnly: true };
  }
  if (typeof eventFlag === "boolean") academy.alterEventTriggersEnabled = eventFlag;
  if (typeof webFlag === "boolean") academy.webSearchEnabled = webFlag;
  if (typeof imageFlag === "boolean") academy.imageGenEnabled = imageFlag;
  const flagOnly =
    !("aiEnabled" in body) &&
    (typeof eventFlag === "boolean" ||
      typeof webFlag === "boolean" ||
      typeof imageFlag === "boolean");
  if (typeof body.aiEnabled === "boolean") academy.aiEnabled = body.aiEnabled;
  else if (!flagOnly) academy.aiEnabled = !academy.aiEnabled;
  return { ok: true, eventOnly: false };
};
