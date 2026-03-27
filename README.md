# SmartGroceries

SmartGroceries is a frontend-only Smart Grocery Planner built with React + TypeScript.

It helps users:
- manage a household product catalog,
- prepare a budget-aware shopping list,
- track in-store spending with real prices,
- store purchase history locally for future planning.

## Features

- Product catalog with stock status and priority
- Shopping preparation under a budget constraint
- In-store mode with picked state and price input
- Configurable price rounding (10 / 50 / 100)
- Purchase history and latest price tracking
- Local persistence using `localStorage`
- GitHub Pages deployment workflow

## Live Demo

[https://acrm.github.io/SmartGroceries/](https://acrm.github.io/SmartGroceries/)

## Product Documentation

- `docs/PRODUCT_SPEC.md` — problem, use cases, user flows, scope
- `docs/ARCHITECTURE.md` — domain model, state, persistence, folder layout
- `docs/IMPLEMENTATION_PLAN.md` — workshop-ready incremental roadmap
- `docs/GAME_LOGIC.md` — core decision logic and flow rules
- `docs/TODO.md` — prioritized backlog

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

## Architecture Overview

- Frontend only, static deployment, no backend.
- Global typed state for products, sessions, shopping items, and history.
- Local persistence through storage abstraction over `localStorage`.
- Domain logic isolated from UI components.
- Feature-oriented screen modules:
	- Product Catalog
	- Shopping Preparation
	- In-Store Mode
	- History

See `docs/ARCHITECTURE.md` for full details.

## Core Product Flows

1. Manage product catalog (what should exist at home).
2. Start shopping session with budget and rounding step.
3. Prioritize candidates under budget.
4. In-store: mark picked, enter prices, monitor remaining budget.
5. Complete session and store history.

See `docs/PRODUCT_SPEC.md` and `docs/GAME_LOGIC.md`.

## Implementation Roadmap

Use `docs/IMPLEMENTATION_PLAN.md` for a step-by-step workshop sequence from domain modeling to UX polish.

### Validation and Build

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment

Deployment is configured via GitHub Actions in `.github/workflows/deploy.yml`.

For local Pages-compatible production build:

```bash
npm run build
```

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
	PRODUCT_SPEC.md
	ARCHITECTURE.md
	IMPLEMENTATION_PLAN.md
	GAME_LOGIC.md
	TODO.md
	AGENT_BOOTSTRAP_PROMPT.md
scripts/
	update-version.js
```

## Agent Workflow Notes

See `AI_AGENT_INSTRUCTIONS.md` and `.github/copilot-instructions.md` for repository workflow policy.
