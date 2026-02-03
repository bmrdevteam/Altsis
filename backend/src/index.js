import { app, ready } from "./app.js";
import { initializeWebSocket } from "./utils/webSocket.js";
import { initializeScheduler } from "./services/scheduler.js";

let server = undefined;

const startServer = async () => {
  await ready();
  server = app.listen(app.get("port"), function () {
    console.log(`✅ Express server listening on port ${server.address().port}`);
  });
  initializeWebSocket(server);
  initializeScheduler();
};

startServer();

export { server };
