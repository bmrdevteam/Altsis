import dotenv from "dotenv";
import { resolve } from "path";

console.log(`✅ NODE_ENV is ${process.env.NODE_ENV}`);

if (process.env.NODE_ENV?.trim() === "local") {
  const __dirname = resolve();
  dotenv.config({ path: resolve(__dirname, "../.env.local") });
} else if (process.env.NODE_ENV?.trim() === "test") {
  const __dirname = resolve();
  dotenv.config({ path: resolve(__dirname, "../.env.test") });
} else {
  dotenv.config();
}
