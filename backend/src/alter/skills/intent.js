/**
 * Narrow phrases that mean a draft skill, before the model is asked.
 * Submission and activity wording stay on the read tools.
 */

const formIntent = (text) =>
  (/(시간표|강의계획서|출력)\s*양식/.test(text) && /(만들|작성|초안|다듬)/.test(text)) ||
  (/양식\s*(초안|을|를)?\s*(만들|작성|다듬)/.test(text) && !/활동|미제출|제출/.test(text));

const imageIntent = (text) =>
  /(그림|차트|일러스트|이미지)/.test(text) && /(만들|그려|생성)/.test(text);

const draftIntent = (text) => {
  if (/활동/.test(text) && /(초안|작성|다듬|양식)/.test(text)) return "activity-draft";
  if (/강의계획서/.test(text) && /(초안|작성)/.test(text)) return "syllabus-draft";
  if (/평가/.test(text) && /(초안|작성)/.test(text) && !/채점/.test(text)) return "evaluation-draft";
  if (/기록/.test(text) && /(초안|작성)/.test(text)) return "archive-draft";
  if (/(공지|회의록|매뉴얼)/.test(text) && /(초안|작성|써)/.test(text)) return "document-draft";
  if (/문서/.test(text) && /(점검|검토|리뷰)/.test(text)) return "document-review";
  if (/문서/.test(text) && /(초안|작성|다듬)/.test(text)) return "document-draft";
  if (/응답/.test(text) && /(초안|작성|다듬)/.test(text)) return "form-response-draft";
  if (/채점\s*(초안|해\s*줘)/.test(text) && !/예약/.test(text)) return "assessment-grade";
  return null;
};

export const matchDispatchIntent = (message) => {
  const text = String(message || "").trim();
  if (!text) return null;
  if (formIntent(text)) return "form-draft";
  if (imageIntent(text)) return "generate_image";
  return draftIntent(text);
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
