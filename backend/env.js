import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

console.log("NODE_ENV: ", process.env.NODE_ENV);
if (process.env.NODE_ENV?.trim() === "local") {
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  dotenv.config({ path: resolve(__dirname, "./.env.local") });
} else {
  dotenv.config();
}
