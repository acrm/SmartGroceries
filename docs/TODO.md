# Project Roadmap

## Current Foundation

- [x] Frontend-only React + TypeScript setup
- [x] Local state persistence baseline
- [x] GitHub Pages deployment workflow
- [x] Versioned workflow with build notes
- [x] Product specification and architecture docs

## MVP Delivery Plan

- [x] Create normalized domain store (`products`, `preparedItems`, `history`, `settings`)
- [x] Implement Product Catalog CRUD with nominal quantity and units
- [x] Add Shopping Preparation screen with shared editable budget
- [x] Implement budget-zone prioritization by list order
- [x] Build In-Store mode with live spent/remaining budget
- [x] Add checkout flow and purchase history persistence
- [x] Build History screen with restore back to preparation
- [x] Add drag-and-drop reorder by handle icon
- [x] Add delete confirmation + bulk delete + 5-second undo

## Quality and Workshop Readiness

- [ ] Add reducer-level tests for budget-zone and undo transitions
- [ ] Add stronger migration guard and versioned schema metadata
- [ ] Add explicit error boundary for corrupted local payloads
- [ ] Improve keyboard-only reorder accessibility for DnD handles
- [ ] Add workshop demo script and checkpoints per stage

## Future Extensions

- [ ] Consumption-rate estimation based on purchase cadence
- [ ] Category-level budget caps
- [ ] CSV export/import
- [ ] Enhanced price trend visualization
- [ ] Optional PWA offline UX improvements
