import { Academy } from "../models/index.js";
import { isAcademyAlterEnabled } from "../services/entitlement.js";
import { AI_ERRORS } from "../services/aiPromptPolicy.js";
import { __NOT_FOUND, PERMISSION_DENIED } from "../messages/index.js";

/**
 * 아카데미 Alter(CTRL)가 꺼져 있으면 AI API를 거부한다.
 * isLoggedIn 이후, 또는 세션이 이미 붙은 라우트에서 사용한다.
 */
export const requireAcademyAlter = async (req, res, next) => {
  try {
    const academyId = req.user?.academyId;
    if (!academyId) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const academy = await Academy.findOne({ academyId });
    if (!academy) {
      return res.status(404).send({ message: __NOT_FOUND("academy") });
    }
    if (!isAcademyAlterEnabled(academy)) {
      return res.status(403).send({ message: AI_ERRORS.NOT_ENABLED });
    }
    return next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
