/**
 * Read-only credit-rule lookup from the school library the teacher can see.
 */

import { z } from "zod";
import { AiLibraryItem } from "../../../models/index.js";
import { visibleListFilter } from "../../../services/aiLibraryAcl.js";
import { logger } from "../../../log/logger.js";
import { resolveAlterContext } from "../../policy/access.js";
import { defineTool } from "../defineTool.js";
import { clip, compact } from "../lib/compact.js";

const chatOnly = (deps = {}) => deps.includeScheduleTool !== false && !deps.includeTriggerTool;

const denied = () => ({
  summary: "권한이 없습니다.",
  error: "권한이 없습니다.",
  hits: [],
});

const empty = (query) => ({ summary: "규정 없음", query, hits: [] });

export default defineTool({
  name: "lookup_credit_rules",
  label: "학점 규정",
  description: "학교 라이브러리에서 학점·이수 규정을 읽습니다. 없는 규정은 만들지 않습니다.",
  input: z.object({
    query: z.string().optional(),
  }).strict(),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "학점·졸업·이수 규정은 lookup_credit_rules로만 확인하세요. 도구에 없는 규정은 만들지 마세요.",
  ],
  include: chatOnly,
  async handler(ctx, rawArgs = {}) {
    try {
      await resolveAlterContext(ctx?.academyId, ctx?.user, ctx?.seasonId, {
        runner: "event",
        loaded: ctx || {},
      });
    } catch (err) {
      logger.error(`alter lookup_credit_rules denied: ${err.code || err.message}`);
      return denied();
    }
    const query = clip(rawArgs.query, 200) || "학점 규정";
    const schoolId = ctx.school?._id;
    const userId = ctx.user?._id;
    if (!ctx.academyId || !schoolId || !userId) return empty(query);
    try {
      const tokens = query.split(/\s+/).filter(Boolean).slice(0, 4);
      const textOr = tokens.flatMap((token) => {
        const safe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return [
          { title: { $regex: safe, $options: "i" } },
          { content: { $regex: safe, $options: "i" } },
        ];
      });
      const filter = visibleListFilter(schoolId, userId);
      if (textOr.length) filter.$and = [{ $or: textOr }];
      const items = await AiLibraryItem(ctx.academyId)
        .find(filter)
        .select("title content")
        .limit(8)
        .lean();
      const hits = (items || []).map((item) =>
        compact({
          title: clip(item.title, 80),
          excerpt: clip(item.content, 400),
        })
      );
      if (!hits.length) return empty(query);
      return { summary: `규정 ${hits.length}건`, query, hits };
    } catch (err) {
      logger.error(`alter lookup_credit_rules: ${err.message}`);
      return { summary: "규정을 찾지 못했습니다.", error: "규정을 찾지 못했습니다.", query, hits: [] };
    }
  },
});
