import "./env.js";
import { redisClient, ready } from "./_database/index.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";

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

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env["URL"].trim(),
    credentials: true,
  })
  // cors() //테스트를 위해 모든 도메인에서 오는 요청 허용(임시)
);

app.use(
  session({
    resave: false, // req마다 session 새로 저장
    saveUninitialized: false, // uninitialized session을 저장함. false인 것이 리소스 활용 측면에서 유리하지만 rolling을 사용하려면 true가 되어야 한다.
    secret: process.env["session_key"].trim(),
    cookie: {
      httpOnly: true, // 브라우저에서 쿠키값에 대한 접근을 하지 못하게 막는다.
      secure: false, // HTTPS 통신 외에서는 쿠키를 전달하지 않는다.
    },
    rolling: true,
    store: new RedisStore({
      client: redisClient,
      ttl: 24 * 60 * 60, //1 day
      // no need to set reapInterval
    }),
    //  store : new FileStore({
    //   ttl:24*60*60, // 1 day
    //   path: "./sessions",
    //   reapInterval: 12*60*60 // purge all expired cookies every 12 hours
    //  })
  })
);
app.use(passport.initialize());
app.use(passport.session()); //반드시 app.use(session(...)) 아래에 있어야 함

// const combined =
//   ':remote-addr - :remote-user ":method :url HTTP/:http-version" :body ":status :response-time ms" ":referrer" ":user-agent"';

const combined = (tokens, req, res) => {
  return [
    `HTTP/${tokens["http-version"](req, res)}`, // HTTP/1.1,
    tokens["remote-addr"](req, res), // ip
    req.user?.academyId ?? "undefined",
    req.user?._id ?? "undefined",
    tokens["method"](req, res), // POST, GET, ...
    tokens["url"](req, res), // '/api/users/current'
    '"' + JSON.stringify(req.body) + '"', // req.body
    tokens["status"](req, res), // 200, 404, ...
    tokens["response-time"](req, res), // ms
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

// app.use(morgan(morganFormat, { stream: logger.stream })); // morgan

routers.forEach((router) => {
  app.use("/api/" + router.label, router.routes);
});

app.set("port", process.env["SERVER_PORT"].trim() || 3000);

export { app, ready };
