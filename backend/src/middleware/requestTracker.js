import { RequestStat } from "../models/index.js";

export const requestTracker = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const academyId = req.user?.academyId;
    if (!academyId) return;

    const responseTime = Date.now() - startTime;
    const date = new Date().toISOString().slice(0, 10);
    const dataIn = parseInt(req.get("content-length") || "0", 10);
    const dataOut = parseInt(res.get("content-length") || "0", 10);
    const userId = req.user?.userId || "anonymous";

    RequestStat(academyId)
      .updateOne(
        { date },
        {
          $inc: {
            requests: 1,
            totalResponseTime: responseTime,
            dataIn: dataIn,
            dataOut: dataOut,
          },
          $addToSet: { uniqueUsers: userId },
        },
        { upsert: true }
      )
      .catch(() => {});
  });

  next();
};
