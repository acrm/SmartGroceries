# Project Roadmap

## Current Features
- [x] Product catalog management
- [x] Shopping list toggling
- [x] Bought-state tracking
- [x] Local persistence via browser storage
- [x] Mobile-first layout and tab flow

## TODO
- [ ] Add optional product categories
- [ ] Add reorder and sort controls
- [ ] Add duplicate-name validation
- [ ] Add search/filter for large lists
- [ ] Add import/export of saved data
- [ ] Add basic unit tests for state transitions

## Known Issues
- No automated tests are currently configured.
- Product IDs are random and not deterministic for test fixtures.

## Technical Debt
- Extract storage and list mutations into reusable modules.
- Introduce shared UI components for buttons and list rows.
