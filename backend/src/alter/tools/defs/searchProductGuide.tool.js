import { z } from "zod";
import { retrieveAlterGuide } from "../../../services/alterGuideRetrieve.js";
import { buildAlterGuideLinks } from "../../../services/alterGuideLinks.js";
import { logger } from "../../../log/logger.js";
import { defineTool } from "../defineTool.js";
import { clip, compact } from "../lib/compact.js";
import {
  GUIDE_CANDIDATES,
  GUIDE_CHARS,
  GUIDE_HITS,
  guideTitleForModel,
  rankGuideHit,
} from "../lib/guideRank.js";

export default defineTool({
  name: "search_product_guide",
  label: "제품 안내",
  description: "메뉴·입력 방법(어디서/어떻게/방법). 할 일과 함께 물으면 같은 턴에 호출.",
  input: z.object({
    query: z.string(),
  }),
  permission: { roles: ["teacher"], access: "self" },
  readOnly: true,
  untrustedOutput: true,
  promptHints: [
    "어디서/어떻게/방법을 함께 물으면 search_product_guide도 같은 턴에 호출하세요. 할 일만으로 화면 위치를 만들지 마세요.",
    "메뉴·알림·기능은 search_product_guide 결과에 나온 것만 안내하세요.",
  ],
  async handler(ctx, rawArgs = {}) {
    const loadGuide = ctx.deps?.retrieveAlterGuide || retrieveAlterGuide;
    const query = clip(rawArgs.query, 500);
    if (!query) {
      return { summary: "검색어 없음", error: "query가 필요합니다.", hits: [] };
    }
    try {
      const hits = loadGuide({
        query,
        auth: ctx.user?.auth,
        isSchoolManager: !!ctx.isSchoolManager,
        limit: GUIDE_CANDIDATES,
        perDoc: 4,
      });
      const ranked = (hits || []).map((hit, order) => rankGuideHit(hit, query, order));
      ranked.sort((a, b) => b.score - a.score || a.order - b.order);
      const useful = ranked.filter((row) => row.score > 0 && row.excerpt);
      const chosen = (useful.length ? useful : ranked.filter((row) => row.excerpt)).slice(0, GUIDE_HITS);
      const rows = chosen.map((row) => row.hit);
      const projected = chosen.map((row) =>
        compact({
          title: clip(guideTitleForModel(row.hit.title), 80),
          doc: clip(row.hit.key, 160),
          excerpt: clip(row.excerpt, GUIDE_CHARS),
        })
      );
      const links = buildAlterGuideLinks(rows, {
        user: ctx.user,
        school: ctx.school,
        registration: ctx.registration,
        message: ctx.message || query,
      });
      return {
        summary: projected.length ? `안내 ${projected.length}건` : "안내 없음",
        query,
        hits: projected,
        links,
      };
    } catch (err) {
      logger.error(`alter agent search_product_guide: ${err.message}`);
      return { summary: "안내 검색 실패", error: "제품 안내를 찾지 못했습니다.", hits: [] };
    }
  },
});
