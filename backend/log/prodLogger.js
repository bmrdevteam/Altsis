const winston = require("winston");
const { format } = winston;
const { combine, timestamp, printf, label } = format;
const WinstonDaily = require("winston-daily-rotate-file");
const S3StreamLogger = require("s3-streamlogger-daily").S3StreamLogger;
const strftime = require("strftime");

const strftimeKOR = strftime.timezone("+0900");

/* prodLogger */
const stream = (level = "") => {
  const time_data = strftimeKOR("%F %T", new Date());

  return new S3StreamLogger({
    bucket: "altsis-logs",
    access_key_id: process.env.s3_accessKeyId2,
    secret_access_key: process.env.s3_secretAccessKey2,
    name_format: `${time_data}${level !== "" ? "." + level : ""}.log`,
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

module.exports.prodLogger = prodLogger;
