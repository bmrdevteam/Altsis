# Agent Instructions

Altsis (Alternative School Information System) — Korean-language educational management for alternative schools.

## Code quality (always)

Follow [`.agents/rules/code-quality-standards.md`](.agents/rules/code-quality-standards.md) from the first line of implementation through review. Cursor loads the same standards via [`.cursor/rules/code-quality-standards.mdc`](.cursor/rules/code-quality-standards.mdc).

Six pillars: Architecture & Clean Code · Security (OWASP) · Performance · Testing & Reliability · Documentation · Accessibility (UI).

## Project context

See [`CLAUDE.md`](CLAUDE.md) for commands, multi-DB architecture, frontend/backend patterns, and domain concepts.

## 「마무리」 workflow

When the user says **마무리**, follow [`.cursor/skills/마무리/SKILL.md`](.cursor/skills/마무리/SKILL.md): cleanup → self-review (Review Output Format) → test → Korean commit → push → land on `399-feature-altsis-next-project-update-to-v20` → **자동 배포** to `test-frontend` and `test-backend` via `.cursor/skills/마무리/scripts/deploy-to-test.sh`. Do not ask before deploying; 「마무리」 pre-authorizes test-branch merge/push. Open a feature PR only if asked. If test branches reject direct push, open deploy PRs into those branches. If Auto-review blocks the deploy command, retry the same command with `request_smart_mode_approval`.
