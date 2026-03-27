# SmartGroceries

SmartGroceries is a mobile-first React + TypeScript app for managing grocery products and shopping progress.

## Features

- Product catalog with quick add/delete flow
- Shopping list toggle from catalog
- Bought state tracking with one-tap toggles
- Local persistence using `localStorage`
- GitHub Pages deployment workflow

## Live Demo

[https://acrm.github.io/SmartGroceries/](https://acrm.github.io/SmartGroceries/)

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation and Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Validation and Build

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment

Deployment is configured via GitHub Actions in `.github/workflows/deploy.yml`.

## Version Management

This repository uses a week-based version format:

- Format: `<weekCode>-<minor>.<build>`
- Example: `2026w10-0.1`

After tracked file changes:

```bash
npm run bump:build -- --desc "Short English summary"
```

For minor milestone bumps:

```bash
npm run bump:minor -- --desc "Short English summary"
```

The bump script keeps `version.json` and `package.json` synchronized and appends entries to `build-notes.md`.

## Project Structure

```text
src/
	App.tsx
	App.css
	index.css
docs/
	GAME_LOGIC.md
	TODO.md
	AGENT_BOOTSTRAP_PROMPT.md
scripts/
	update-version.js
```

## Agent Workflow Notes

See `AI_AGENT_INSTRUCTIONS.md` and `.github/copilot-instructions.md` for repository workflow policy.
