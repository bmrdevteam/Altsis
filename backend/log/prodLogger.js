import winston, { format } from "winston";
const { combine, timestamp, printf, label } = format;
import WinstonDaily from "winston-daily-rotate-file";
import * as _S3StreamLogger from "s3-streamlogger-daily";
const S3StreamLogger = _S3StreamLogger.S3StreamLogger;
import strftime from "strftime";
import mongoose from "mongoose";

const strftimeKOR = strftime.timezone("+0900");

/* prodLogger */
const stream = (level = "") => {
  const instanceId = new mongoose.Types.ObjectId();
  const time_data = strftimeKOR("%F %T", new Date());

  return new S3StreamLogger({
    bucket: "altsis-logs",
    folder: "raw",
    access_key_id: process.env.s3_accessKeyId2,
    secret_access_key: process.env.s3_secretAccessKey2,
    name_format: `${time_data} ${instanceId.toString()}${
      level !== "" ? "." + level : ""
    }.log`,
    rotate_every: "day",
    max_file_size: 2000000000, // 2gb
  });
};

const prodLogger = winston.createLogger({
  level: "http",
  format: combine(
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    printf((info) => {
      return `${info.timestamp},${info.level},${info.message}`;
    })
  ),
  defaultMeta: { service: "user-service" },
  transports: [
    new WinstonDaily({
      level: "http",
      stream: stream(),
    }),
    new WinstonDaily({
      level: "info",
      stream: stream("info"),
    }),
    new WinstonDaily({
      level: "error",
      stream: stream("error"),
    }),
  ],
});

prodLogger.stream = {
  write: (message) => {
    prodLogger.http(message);
  },
};

export { prodLogger };
