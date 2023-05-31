import { app, ready } from "./app.js";
import { logger } from "./log/logger.js";
import { initializeWebSocket } from "./utils/webSocket.js";

let server = undefined;

const startServer = async () => {
  await ready();
  server = app.listen(app.get("port"), function () {
    const text = `✅ Express server listening on port ${server.address().port}`;
    console.log(text);
    logger.info(text);
  });
  initializeWebSocket(server);
};

startServer();

export { server };
