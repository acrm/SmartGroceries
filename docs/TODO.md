# Project Roadmap

## Current Foundation

- [x] Frontend-only React + TypeScript setup
- [x] Local state persistence baseline
- [x] GitHub Pages deployment workflow
- [x] Versioned workflow with build notes
- [x] Product specification and architecture docs

## MVP Delivery Plan

- [ ] Create normalized domain store (`products`, `sessions`, `items`, `history`)
- [ ] Implement Product Catalog CRUD with stock status and priority
- [ ] Add Shopping Preparation screen with budget + rounding setup
- [ ] Implement budget-based item prioritization
- [ ] Build In-Store mode with live spent/remaining budget
- [ ] Implement rounded price input (`10/50/100`)
- [ ] Add Checkout flow and purchase history persistence
- [ ] Build History screen (sessions + product price changes)

## Quality and Workshop Readiness

- [ ] Add reducer-level tests for budget and lifecycle transitions
- [ ] Add data migration guard for future schema updates
- [ ] Add empty/error states for corrupted local data
- [ ] Add keyboard accessibility and mobile interaction polish
- [ ] Add workshop demo script and checkpoints per stage

## Future Extensions

- [ ] Consumption-rate estimation based on purchase cadence
- [ ] Category-level budget caps
- [ ] CSV export/import
- [ ] Enhanced price trend visualization
- [ ] Optional PWA offline UX improvements
