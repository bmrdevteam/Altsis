# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code quality

Always follow [`.agents/rules/code-quality-standards.md`](.agents/rules/code-quality-standards.md) (6 pillars) while implementing, not only at review time. See also `AGENTS.md`.

## Project Overview

Altsis (Alternative School Information System) — a Korean-language educational management system for alternative schools. Supports multi-academy, multi-school operations. MIT licensed, open-source.

## Commands

### Backend (`cd backend`)
```bash
yarn dev          # Development server (nodemon, NODE_ENV=development)
yarn local        # Local dev with .env.local (ignores test files)
yarn prod         # Production mode
yarn test         # Run all Jest tests (currently: tests/APIs/userAPI/**)
yarn test -- --watch TestName  # Watch mode for specific test
yarn jsdoc        # Generate JSDoc documentation
```

### Frontend (`cd frontend`)
```bash
yarn start        # Development server (CRA)
yarn build        # Production build
yarn test         # Jest test runner
```

### Environment
- Backend reads `.env` by default, `.env.local` for `yarn local`, `.env.test` for tests
- Frontend uses `REACT_APP_BACKEND_URL` in `.env`
- Requires: Node.js 20 LTS, Yarn 3.2.3

## Architecture

### Multi-Database Design
Each academy gets its own MongoDB database. A root database stores academy metadata. Connections are dynamically created per academy in `backend/src/_database/mongodb/index.js`. This means most model operations require the correct academy connection — accessed via `conn[academyId]`.

### Route Structure
All authenticated frontend routes are prefixed with `/:academyId/:schoolId`. The `UrlContextSync` component keeps URL params in sync with AuthContext. Backend API endpoints are at `/api/{resource}`.

### Frontend Key Patterns
- **API layer**: `frontend/src/hooks/useAPIv2.ts` — single file containing all API methods organized by domain (UserAPI, SchoolAPI, SeasonAPI, etc.). Use `const { DomainAPI } = useAPIv2()` in components.
- **Auth state**: `useAuth()` from `contexts/authContext.tsx` — provides `currentUser`, `currentSchool`, `currentRegistration`, `currentSeason`, plus `changeSchool()` and `changeRegistration()`.
- **Theme system**: `useTheme()` from `contexts/themeContext.tsx` — 6 modes (light/dark/high-contrast/sepia/system/custom). Custom themes use 7 base colors auto-generated into 50+ CSS variables via `utils/themeGenerator.ts`.
- **Styling**: SCSS modules (`.module.scss`) with CSS custom properties from `style/variables.scss`. Never hardcode colors — always use CSS variables.
- **State**: Zustand for editor state only; React Context for auth/theme; component-local state everywhere else.
- **Imports**: `tsconfig.json` sets `baseUrl: "src/"`, so imports like `import X from "pages/foo/Bar"` resolve from `src/`.

### Backend Key Patterns
- **ES Modules**: Backend uses `"type": "module"` — all imports/exports use ESM syntax.
- **Controller pattern**: Async functions with try/catch, returning JSON with HTTP status codes. Error messages use string keys that map to Korean UI messages on the frontend.
- **Services**: Complex business logic lives in `backend/src/services/` and is reused across controllers.
- **Middleware**: `auth.js` (session auth), `board.js` (board membership), `chat.js` (chat access), `requestTracker.js` (analytics).
- **Sessions**: Redis-backed via connect-redis (24h TTL). Auth uses Passport.js with custom + Google OAuth strategies.

### Real-time
Socket.IO for chat, notifications, and live updates. Server-side setup in `backend/src/utils/webSocket.js`.

## Domain Concepts
- **Academy**: Top-level org (has its own database)
- **School**: Sub-organization within an academy
- **Season**: Academic period containing registrations
- **Registration**: A student's enrollment in a season. `registration.year` already contains the "학년도" suffix — don't append it again.
- **Syllabus**: Course/lecture plan
- **Enrollment**: Student participation in a course (includes grades)
- **AltForm**: Customizable evaluation/record forms
- **Board**: Discussion boards with permission-based access
- **CalendarEvent**: Events synced from multiple sources (manual, enrollment, syllabus, memo). Multi-day events use `duration` (total days) and `sequence` (1-based day index). `sourceType` distinguishes origin.

## Code Style
- Prettier for formatting (run before submitting PRs)
- ESLint extends `react-app` in frontend
- Airbnb style guide as reference
- Korean UI strings throughout — maintain consistency
- PRs target the `dev` branch
