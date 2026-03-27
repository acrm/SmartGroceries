# AI Agent Instructions

## Language Policy
- User-facing chat replies: Russian.
- File content (code/docs/config): English only.

## Versioning Strategy

Version format: `<weekCode>-<minor>.<build>`
- `weekCode`: current ISO week (e.g., `2026w10`)
- `minor`: minor version (reset on week change)
- `build`: incremental build number

### Mandatory Version Bump After Any Tracked File Change

After modifying any tracked file:
1. Run one bump command with description:
	 - `npm run bump:build -- --desc "Short English summary"`
	 - or `npm run bump:minor -- --desc "Short English summary"`
2. The bump script updates `version.json`, `package.json`, `build-notes.md` and creates commit automatically.
3. Verify project health (`npm run typecheck`, `npm run lint`, `npm run build`).

Default commit behavior:
- Commit all repository changes after bump (`git add -A`).

Staged-only commit behavior:
- Use `npm run bump:build:staged -- --desc "Short English summary"` or
	`npm run bump:minor:staged -- --desc "Short English summary"`.
- Script commits only files that were already staged at call time, plus mandatory version files.

### Commands Reference

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run typecheck` — validate TypeScript
- `npm run lint` — check code style
- `npm run test` — run tests (if configured)
- `npm run bump:build -- --desc "..."` — bump build version
- `npm run bump:minor -- --desc "..."` — bump minor version
- `npm run bump:build:staged -- --desc "..."` — staged-only build bump with auto-commit
- `npm run bump:minor:staged -- --desc "..."` — staged-only minor bump with auto-commit

## Project Documentation Synchronization

After code changes, review and update:
- `docs/GAME_LOGIC.md` — product behavior and flow
- `docs/TODO.md` — roadmap and known issues
- `README.md` — project overview

Keep docs in English, concise, and factual.

## Git Workflow

1. Make code changes
2. Optionally stage only the files you want in commit
3. Run bump script with `--desc` (script auto-commits)
4. Verify: `npm run typecheck && npm run lint && npm run build`
5. Push to GitHub

## File Locations to Know

- Main app: `src/App.tsx`
- Styles: `src/App.css`, `src/index.css`
- Domain docs: `docs/GAME_LOGIC.md`, `docs/TODO.md`
- Vite config: `vite.config.ts`
- Version files: `version.json`, `package.json` (sync both)
