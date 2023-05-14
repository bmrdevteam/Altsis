import { prodLogger } from "./prodLogger.js";
import { devLogger } from "./devLogger.js";

const logger = process.env.NODE_ENV === "production" ? prodLogger : devLogger;

export { logger };
