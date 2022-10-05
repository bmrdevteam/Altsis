require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

const passportConfig = require("./passport");
const routers = require("./routes/index");

const app = express();

passportConfig();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env["URL"].trim(),
    credentials: true,
  })
  // cors() //테스트를 위해 모든 도메인에서 오는 요청 허용(임시)
);

const RedisStore = require("connect-redis")(session);
const client = require("./caches/redis");

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
      client,
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

routers.forEach((router) => {
  app.use("/api/" + router, require("./routes/" + router));
});

module.exports = app;

app.set("port", process.env["SERVER_PORT"].trim() || 3000);
var server = app.listen(app.get("port"), function () {
  console.log("Express server listening on port " + server.address().port);
});
