# Agent Instructions

Altsis (Alternative School Information System) — Korean-language educational management for alternative schools.

## Code quality (always)

Follow [`.agents/rules/code-quality-standards.md`](.agents/rules/code-quality-standards.md) from the first line of implementation through review. Cursor loads the same standards via [`.cursor/rules/code-quality-standards.mdc`](.cursor/rules/code-quality-standards.mdc).

Six pillars: Architecture & Clean Code · Security (OWASP) · Performance · Testing & Reliability · Documentation · Accessibility (UI).

## Project context

See [`CLAUDE.md`](CLAUDE.md) for commands, multi-DB architecture, frontend/backend patterns, and domain concepts.

## 「마무리」 workflow

When the user says **마무리**, follow [`.cursor/skills/마무리/SKILL.md`](.cursor/skills/마무리/SKILL.md): cleanup → self-review (Review Output Format) → test → Korean commit → push. Do not create a PR unless asked.

## Cursor Cloud specific instructions

Standard commands/env vars live in [`CLAUDE.md`](CLAUDE.md) and [`README.md`](README.md). The notes below are the non-obvious cloud gotchas. The startup update script only refreshes `node_modules`; you must start the databases and dev servers yourself each session.

### Node / package manager
- The app targets **Node 20**, but the sandbox default `node` (`/exec-daemon/node`) is v22 and shadows everything on `PATH`. `~/.bashrc` is configured to prepend nvm's Node 20, so normal shells already get Node 20 (`node --version` → v20.x). If a script ever sees v22, run `nvm use 20` (or `export PATH="$(dirname "$(nvm which 20)"):$PATH"`).
- Lockfiles are **yarn v1** and the project uses **yarn classic (1.x)**, matching each `Dockerfile`. The backend `package.json` has a stale `"packageManager": "yarn@3.2.3"` field that makes yarn classic refuse to run. Two ways to cope: (a) run backend scripts with `npm run <script>` / `npm test` (npm ignores the field), or (b) temporarily delete that field for `yarn install` (what the Dockerfile and the update script do). Do NOT enable corepack — yarn 3 would rewrite the lockfile to PnP.
- `yarn dev` needs a global `nodemon` (it is not a project dependency); it is installed globally under Node 20.

### Services (start these yourself; the update script does not)
- MongoDB: `mongod --dbpath ~/data/db --logpath ~/data/log/mongod.log --port 27017 --bind_ip 127.0.0.1 --fork`
- Redis (dev): `redis-server --daemonize yes --port 6379`
- Redis (tests): backend Jest connects to a **hardcoded** `127.0.0.1:6369`, so also run `redis-server --daemonize yes --port 6369`.
- Backend: `cd backend && npm run dev` → port `SERVER_PORT` (8080). Needs `backend/.env`.
- Frontend: `cd frontend && npm start` → port `PORT` (3030). Needs `frontend/.env`.
- Redis mode gotcha: `NODE_ENV=development`/`production` use `REDIS_URL`; `NODE_ENV=local`/`test` ignore it and hardcode `127.0.0.1:6369`.

### Env files (gitignored, must exist for local dev)
- `backend/.env` and `frontend/.env` are required. The backend crashes at boot if `URL`, `SERVER_PORT`, `DB_URL`, `session_key`, `saltRounds`, the `s3_*`/`s3_*2`, and `ENCKEY_*`/`SIGKEY_*` vars are unset (read with `.trim()`), but **dummy** S3/encryption values are fine locally. Google OAuth, real S3, AI keys, and VAPID are optional.

### First-login bootstrap
- Login requires a `root` academy doc (in the `root` DB `academies` collection) and an `owner` user (in the `root` DB `users` collection) whose `password` is a bcrypt hash. Seed one directly in Mongo (README §초기 설정 shows the manual flow). Once logged in as owner you can create academies from `/owner/academies`.

### Test / build / lint
- Backend: `cd backend && npm test` (Jest; needs Redis on 6369; skips Mongo).
- Frontend: `cd frontend && CI=true npm test`; build with `cd frontend && CI=false npm run build` (`CI=true` turns ESLint warnings into errors and fails the build).
- No standalone lint command: frontend ESLint (`react-app`) runs during `npm start`/`npm run build`; backend has no linter (Prettier only for formatting).
