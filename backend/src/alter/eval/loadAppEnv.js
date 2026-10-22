/**
 * App configuration for the eval CLI.
 * `src/env.js` reads dotenv. With the process cwd at `backend/` and
 * `NODE_ENV` unset, that file is `backend/.env`. `local` and `test` keep
 * the app's other files. Shell variables are already set, so dotenv leaves
 * them in place.
 */
import "../../env.js";
