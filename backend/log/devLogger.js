const winston = require("winston");
const { format } = winston;
const { combine, timestamp, printf, label } = format;
const WinstonDaily = require("winston-daily-rotate-file");

const devLogger = winston.createLogger({
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
      datePattern: "YYYY-MM-DD",
      dirname: "./logs",
      filename: `%DATE%.log`,
      maxSize: "20m",
      maxFiles: "7d",
      zippedArchive: true,
    }),
    new WinstonDaily({
      level: "info",
      datePattern: "YYYY-MM-DD",
      dirname: "./logs",
      filename: `%DATE%.info.log`,
      maxSize: "20m",
      maxFiles: "7d",
      zippedArchive: true,
    }),
    new WinstonDaily({
      level: "error",
      datePattern: "YYYY-MM-DD",
      dirname: "./logs",
      filename: `%DATE%.error.log`,
      maxSize: "20m",
      maxFiles: "7d",
      zippedArchive: true,
    }),
  ],
});

devLogger.stream = {
  write: (message) => {
    devLogger.http(message);
  },
};

module.exports.devLogger = devLogger;
