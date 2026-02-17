import dotenv from "dotenv";
import { resolve } from "path";

/* NODE_ENV is logged via winston logger after initialization */

if (process.env.NODE_ENV?.trim() === "local") {
  const __dirname = resolve();
  dotenv.config({ path: resolve(__dirname, "../.env.local") });
} else if (process.env.NODE_ENV?.trim() === "test") {
  const __dirname = resolve();
  dotenv.config({ path: resolve(__dirname, "../.env.test") });
} else {
  dotenv.config();
}
