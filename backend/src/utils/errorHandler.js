import { logger } from "../log/logger.js";

const errorHandler = (block) => async (req, res) => {
  try {
    await block(req, res);
  } catch (e) {
    logger.error(e.message);
    res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

const wrapWithErrorHandler = (obj) => {
  Object.keys(obj).forEach((key) => {
    obj[key] = errorHandler(obj[key]);
  });
  return obj;
};

export { wrapWithErrorHandler };
