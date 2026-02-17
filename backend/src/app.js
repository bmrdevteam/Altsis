import "./env.js";
import { redisClient, ready } from "./_database/index.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import helmet from "helmet";

import passport from "passport";
import { config as passportConfig } from "./_passport/index.js";

import { routers } from "./routes/index.js";

/* logger */
import morgan from "morgan";
import { logger } from "./log/logger.js";

import connectRedis from "connect-redis";
const RedisStore = connectRedis(session);

const app = express();

passportConfig();

/* security headers */
app.use(helmet());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env["URL"].trim(),
    credentials: true,
  })
);

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: process.env["session_key"].trim(),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
    },
    rolling: true,
    store: new RedisStore({
      client: redisClient,
      ttl: 24 * 60 * 60, //1 day
    }),
  })
);
app.use(passport.initialize());
app.use(passport.session());

const sensitiveFields = ["password", "token", "secret", "apiKey", "aiApiKey"];
const sanitizeBody = (body) => {
  if (!body || typeof body !== "object") return body;
  const sanitized = { ...body };
  for (const field of sensitiveFields) {
    if (field in sanitized) sanitized[field] = "[REDACTED]";
  }
  return sanitized;
};

const combined = (tokens, req, res) => {
  return [
    `HTTP/${tokens["http-version"](req, res)}`,
    tokens["remote-addr"](req, res),
    req.user?.academyId ?? "undefined",
    req.user?._id ?? "undefined",
    tokens["method"](req, res),
    tokens["url"](req, res),
    '"' + JSON.stringify(sanitizeBody(req.body)) + '"',
    tokens["status"](req, res),
    tokens["response-time"](req, res),
    '"' + tokens["referrer"](req, res) + '"',
    '"' + tokens["user-agent"](req, res) + '"',
  ].join(",");
};

app.use(
  morgan(combined, {
    skip: (req, res) => req.url === "/index.html",
    stream: logger.stream,
  })
);

routers.forEach((router) => {
  app.use("/api/" + router.label, router.routes);
});

app.set("port", process.env["SERVER_PORT"].trim() || 3000);

export { app, ready };
