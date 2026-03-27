# Repository Copilot Workflow

## Operational Rules
- User-facing chat replies must be in Russian.
- File content (code/docs/config) must be in English.
- After any tracked file change, run version bump:
  - `npm run bump:build -- --desc "Short English summary"`
  - `npm run bump:minor -- --desc "Short English summary"`
- Bump script performs commit automatically with message `<version>: <description>`.
- Default bump commit includes all repository changes.
- For staged-only commit use:
  - `npm run bump:build:staged -- --desc "Short English summary"`
  - `npm run bump:minor:staged -- --desc "Short English summary"`
- Keep version synchronized in `version.json` and `package.json`.
- Ensure `build-notes.md` gets appended on each bump.
- Standard sequence: change files -> (optional stage subset) -> bump version (auto-commit) -> verify.
- After any source change, review and update domain docs if impacted.

## Key Documentation
- `README.md` — project overview
- `docs/GAME_LOGIC.md` — app behavior and core flows
- `docs/TODO.md` — roadmap
- `src/App.tsx` — main application logic

## Development Commands
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Test: `npm run test`
- Lint: `npm run lint`
- Dev: `npm run dev`
- Bump build: `npm run bump:build -- --desc "Short English summary"`
- Bump minor: `npm run bump:minor -- --desc "Short English summary"`
- Bump build (staged-only): `npm run bump:build:staged -- --desc "Short English summary"`
- Bump minor (staged-only): `npm run bump:minor:staged -- --desc "Short English summary"`
