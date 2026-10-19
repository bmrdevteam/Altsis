/**
 * Chat-only image generation. Off unless the academy flag is on.
 * Schedule and event runs never receive this tool.
 */

import { z } from "zod";
import { IMAGE_DAILY_LIMIT, IMAGE_PROMPT_MAX } from "../../core/limits.js";
import { maskSensitiveText } from "../../core/safety.js";
import { asUsage } from "../../core/usage.js";
import { viewableFileUrl } from "../../../_s3/fileBucket.js";
import { logger } from "../../../log/logger.js";
import { countImageGensToday, runAlterImage } from "../../../services/alterImage.js";
import { resolveAlterContext } from "../../policy/access.js";
import { defineTool } from "../defineTool.js";

const OFF = "이미지 생성은 꺼져 있습니다.";
const BLOCKED = "예약과 이벤트에서는 이미지를 만들지 않습니다.";
const LIMITED = "오늘 이미지 생성 한도에 도달했습니다.";
const FAILED = "이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const UNSUPPORTED = "이 AI 제공자는 이미지 생성을 지원하지 않습니다.";
const REAL_PERSON = "실존하는 학생이나 사람의 이미지는 만들지 않습니다.";
const TOO_BIG = "이미지 크기 한도를 넘었습니다.";
const STORE_FAILED = "이미지를 만들었지만 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const LOCAL_STORE = "이미지를 만들었지만 이 환경에는 저장할 파일 버킷이 없습니다. 파일 저장소가 있는 곳에서 다시 시도해 주세요.";
const DENIED = "이 학원 키로는 이미지를 만들지 못했습니다. 학원 소유자가 AI 설정을 확인해 주세요.";
const LIMITED_RATE = "이미지 생성이 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.";
const REJECTED = "이미지 요청이 거절되었습니다. 그림 설명을 바꿔 주세요.";
const POLICY = "이 그림 설명으로는 이미지를 만들 수 없습니다.";
const EMPTY = "이미지 응답에 그림이 없었습니다. 잠시 후 다시 시도해 주세요.";

const REAL_PERSON_RE =
  /실존|실사|초상|얼굴|본인\s*사진|학생\s*사진|real\s+(person|student|people)|photo\s+of|portrait\s+of|identifiable/i;

export const refusesRealPerson = (prompt) => REAL_PERSON_RE.test(String(prompt || ""));

export const sanitizeImagePrompt = (raw) => {
  const masked = maskSensitiveText(String(raw || "")).text;
  return masked
    .replace(/\[(연락처|이메일|개인정보)\]/g, " ")
    .replace(/\d{6,}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, IMAGE_PROMPT_MAX);
};

const safeCode = (value) => {
  const code = String(value || "").trim();
  return /^[A-Za-z0-9_.-]{1,64}$/.test(code) ? code : "";
};

const failureFields = (result) => {
  const status = Number(result?.status);
  const providerCode = safeCode(result?.providerCode);
  const usage = asUsage(result?.usage);
  return {
    ...(status >= 100 && status <= 599 ? { providerStatus: status } : {}),
    ...(providerCode ? { providerCode } : {}),
    ...(usage ? { usage } : {}),
  };
};

const noticeFor = (result) => {
  const code = safeCode(result?.providerCode);
  const status = Number(result?.status) || 0;
  if (result?.error === "STORAGE_ERROR") {
    return code === "local_bucket" ? LOCAL_STORE : STORE_FAILED;
  }
  if (result?.error === "SIZE_CAP") return TOO_BIG;
  if (result?.error === "UNSUPPORTED") return UNSUPPORTED;
  if (result?.error === "LIMIT_REACHED") return LIMITED;
  if (code === "content_policy_violation" || code === "moderation_blocked") return POLICY;
  if (code === "empty_image" || code === "empty_body" || code === "url_only") return EMPTY;
  if (status === 401 || status === 403 || code === "model_not_found") return DENIED;
  if (status === 429 || code === "rate_limit_exceeded") return LIMITED_RATE;
  if (status === 400) return REJECTED;
  return FAILED;
};

const stopped = (summary, error, extra = {}) => ({
  summary,
  error,
  images: [],
  readOnly: true,
  ...extra,
});

const logFailure = (result) => {
  const error = safeCode(result?.error) || "PROVIDER_ERROR";
  const status = Number(result?.status);
  const providerCode = safeCode(result?.providerCode);
  logger.error(
    `alter generate_image ${error}${status >= 100 && status <= 599 ? ` ${status}` : ""}${providerCode ? ` ${providerCode}` : ""}`
  );
};

export default defineTool({
  name: "generate_image",
  label: "이미지 생성",
  description: "채팅에서 그림 한 장을 만듭니다. 학원 설정이 켜져 있을 때만 쓸 수 있습니다.",
  input: z.object({
    prompt: z.string(),
  }).strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  chatOnly: true,
  promptHints: [
    "차트나 도식처럼 새 그림이 필요할 때만 generate_image를 호출하세요. 학사 데이터는 search_school_data, 제품 안내는 search_product_guide입니다.",
    "prompt에는 그림 설명만 적으세요. 학생 이름, 얼굴, 연락처, 성적, 실존 인물은 넣지 마세요. 실존하는 사람의 그림은 거절됩니다.",
    "결과의 그림은 화면에 붙습니다. 답에는 그림 설명만 적고, 결과에 없는 주소는 만들지 마세요.",
  ],
  disabledHint: (deps = {}) =>
    deps.imageGenRequested === true
      ? "예약과 이벤트에서는 이미지를 만들지 않습니다. 그림 요청은 거절하세요."
      : "그림이나 차트를 만들어 달라면 다른 도구로 대신 찾지 마세요. 이미지 생성은 꺼져 있습니다. 학원 소유자가 AI 설정에서 켤 수 있습니다.",
  include: (deps = {}) => deps.imageGenEnabled === true,
  async handler(ctx, rawArgs = {}) {
    if (ctx?.mode && ctx.mode !== "chat") return stopped(BLOCKED, "FORBIDDEN");
    if (ctx?.academy?.imageGenEnabled !== true) return stopped(OFF, "FORBIDDEN");
    if (refusesRealPerson(rawArgs.prompt)) return stopped(REAL_PERSON, "FORBIDDEN");
    try {
      await resolveAlterContext(ctx?.academyId, ctx?.user, ctx?.seasonId, {
        runner: "event",
        loaded: ctx || {},
      });
    } catch (err) {
      logger.error(`alter generate_image denied: ${err.code || err.message}`);
      return stopped("권한이 없습니다.", "PERMISSION_DENIED");
    }
    const prompt = sanitizeImagePrompt(rawArgs.prompt);
    if (refusesRealPerson(prompt)) return stopped(REAL_PERSON, "FORBIDDEN");
    if (!prompt) return stopped("그림 설명이 없습니다.", "INVALID_INPUT");
    if (ctx.academyId && ctx.user?._id) {
      try {
        const used =
          typeof ctx.countImageGens === "function"
            ? await ctx.countImageGens()
            : await countImageGensToday(ctx.academyId, ctx.user._id);
        if (used >= IMAGE_DAILY_LIMIT) return stopped(LIMITED, "LIMIT_REACHED");
      } catch (err) {
        logger.error(`alter generate_image quota: ${err.code || "unavailable"}`);
        return stopped(LIMITED, "LIMIT_REACHED");
      }
    }
    const generate = typeof ctx.generateImage === "function" ? ctx.generateImage : runAlterImage;
    try {
      const result = await generate({ ctx, prompt });
      if (result?.error === "LIMIT_REACHED") return stopped(LIMITED, "LIMIT_REACHED", failureFields(result));
      if (!result?.ok) {
        const error = ["STORAGE_ERROR", "SIZE_CAP", "UNSUPPORTED"].includes(result?.error)
          ? result.error
          : "PROVIDER_ERROR";
        logFailure({ ...result, error });
        return stopped(noticeFor({ ...result, error }), error, failureFields(result));
      }
      const url = viewableFileUrl(result?.url);
      if (!url) {
        logFailure({ error: "STORAGE_ERROR", providerCode: "unsigned_url" });
        return stopped(STORE_FAILED, "STORAGE_ERROR", { providerCode: "unsigned_url" });
      }
      const alt = String(result.alt || "생성된 이미지").replace(/\s+/g, " ").trim().slice(0, 80);
      const usage = asUsage(result.usage);
      return {
        summary: `이미지를 만들었습니다. ${alt} ${url}`,
        images: [
          {
            url,
            alt,
            key: String(result.key || "").slice(0, 500),
            mimeType: String(result.mimeType || "image/png").slice(0, 100),
            name: "생성된 이미지",
          },
        ],
        sourceUrls: [url],
        readOnly: true,
        ...(usage ? { usage } : {}),
      };
    } catch (err) {
      const providerCode = safeCode(err?.code);
      logFailure({ error: "PROVIDER_ERROR", providerCode });
      return stopped(FAILED, "PROVIDER_ERROR", providerCode ? { providerCode } : {});
    }
  },
});
