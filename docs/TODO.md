# Project Roadmap

## Current Foundation

- [x] Frontend-only React + TypeScript setup
- [x] Local state persistence baseline
- [x] Versioned workflow with build notes
- [x] Clean Architecture / Domain Driven Design structure
- [x] Strict <300 line-per-module separation constraint
- [x] Update workflow docs and configs
- [x] Copy bootstrap prompt into docs

## MVP Delivery Plan

- [x] Store migration from context/React to Zustand
- [x] Unit conversions (liters => bottles, grams => packs)
- [x] Transform simple price variable to `priceHistory` array
- [x] DragOverlay support for stable Drag & Drop UI tracking
- [x] Inline additive inputs instead of separate top panels
- [x] 2-line Budget Display (with dynamic remaining balance & `noPriceCount`)
- [x] Shared UI refactoring (`Layout`, `Tabs`)

## Quality and Workshop Readiness

- [ ] Complete `PreparationPage` with DnD lists logic
- [ ] Complete `StorePage` with active budget counters
- [ ] Complete `HistoryPage` with state recovery
- [ ] Add explicit error boundary for corrupted local payloads
- [ ] Improve keyboard-only reorder accessibility for DnD handles

## Future Extensions

- [ ] Consumption-rate estimation based on purchase cadence
- [ ] Category-level budget caps
- [ ] CSV export/import
- [ ] Optional PWA offline UX improvements
