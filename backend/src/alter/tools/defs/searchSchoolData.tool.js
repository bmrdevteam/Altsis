/**
 * Read-only school search. SQL guards stay in executeSearchSkill.
 * The model only sees a Korean summary, never the SQL or an internal error.
 */

import { z } from "zod";
import { executeSearchSkill } from "../../../services/alterSearch.js";
import { logger } from "../../../log/logger.js";
import { asUsage } from "../../core/usage.js";
import { resolveAlterContext } from "../../policy/access.js";
import { defineTool } from "../defineTool.js";
import { clip } from "../lib/compact.js";

const SAFE_FAILURE = "검색에 실패했습니다. 질문을 조금 더 구체적으로 적어 주세요.";

const chatOnly = (deps = {}) => deps.includeScheduleTool !== false && !deps.includeTriggerTool;

const publicSummary = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return "조건에 맞는 행이 없습니다.";
  if (/sql|select\b|insert\b|update\b|delete\b|drop\b/i.test(raw)) return SAFE_FAILURE;
  return raw;
};

const denied = () => ({
  summary: "권한이 없습니다.",
  error: "권한이 없습니다.",
  rowCount: 0,
  readOnly: true,
});

const failed = () => ({
  summary: SAFE_FAILURE,
  error: SAFE_FAILURE,
  rowCount: 0,
  readOnly: true,
});

export default defineTool({
  name: "search_school_data",
  label: "학사 검색",
  description: "권한 있는 학사 데이터를 읽기 전용으로 찾습니다. SQL은 사용자에게 보이지 않습니다.",
  input: z.object({
    question: z.string(),
  }).strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "출석·인원·성적 같은 학사 데이터는 search_school_data만 사용하세요. 이 도구는 읽기 전용입니다.",
    "검색이 실패하면 SQL이나 내부 오류를 옮기지 말고, 질문을 더 구체적으로 해 달라고만 하세요.",
  ],
  include: chatOnly,
  async handler(ctx, rawArgs = {}) {
    try {
      await resolveAlterContext(ctx?.academyId, ctx?.user, ctx?.seasonId, {
        runner: "event",
        loaded: ctx || {},
      });
    } catch (err) {
      logger.error(`alter search_school_data denied: ${err.code || err.message}`);
      return denied();
    }
    const question = clip(rawArgs.question, 500);
    if (!question) return failed();
    const injected = ctx.runReadOnlySearch || ctx.deps?.runReadOnlySearch;
    if (ctx.scriptedDemo && typeof injected !== "function") {
      return { summary: "조건에 맞는 행이 없습니다.", rowCount: 0, readOnly: true };
    }
    const run = typeof injected === "function" ? injected : executeSearchSkill;
    try {
      const result = await run({
        academyId: ctx.academyId,
        user: ctx.user,
        academy: ctx.academy,
        season: ctx.season,
        school: ctx.school,
        registration: ctx.registration,
        context: ctx.screen || {},
        message: question,
        history: [],
        guidelines: "",
      });
      const rowCount = Number(result?.draft?.rowCount);
      const usage = asUsage(result?.tokenUsage);
      return {
        summary: publicSummary(result?.text),
        rowCount: Number.isFinite(rowCount) ? rowCount : 0,
        readOnly: true,
        ...(usage ? { usage } : {}),
      };
    } catch (err) {
      logger.error(`alter search_school_data: ${err.message}`);
      return failed();
    }
  },
});
