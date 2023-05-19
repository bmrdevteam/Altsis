/**
 * Copy and paste this to app.js
 */
const combined = (tokens, req, res) => {
  return [
    tokens["url"](req, res), // '/api/users/current',
    req.testVersion ?? "undefined",
    tokens["status"](req, res), // 200, 404, ...
    tokens["response-time"](req, res), // ms
  ].join(",");
};

app.use(
  morgan(combined, {
    skip: (req, res) => {
      const tokens = req.originalUrl.split("/");
      if (tokens.length >= 3 && tokens[2] === "enrollments") {
        if (tokens.length === 4) {
          req.testVersion = tokens[3];
        }
        return false;
      }
      return true;
    },
    stream: logger.stream,
  })
);
