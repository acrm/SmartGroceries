# Game Logic

## Overview

SmartGroceries is a mobile-first grocery list application where users:
- maintain a reusable product catalog,
- assemble a shopping list from saved products,
- mark items as bought,
- persist all state locally in browser storage.

## Core Mechanics

### Product Catalog
- Users can add products by name.
- Pressing Enter in the input or tapping Add creates a product.
- Deleting a product also removes matching entries from the shopping list.

### Shopping List
- Each product can be toggled in/out of shopping list.
- Shopping entries store a `bought` flag.
- Tapping a shopping row toggles `bought` state.
- Remove button deletes only that shopping entry.

### Progress Tracking
- Summary displays `bought / total` counters.
- "Clear bought" removes completed entries only.

### Persistence
- Product data is saved under `sg_products` in `localStorage`.
- Shopping data is saved under `sg_shopping` in `localStorage`.
- Invalid JSON in storage gracefully falls back to empty arrays.

## UI Flow

- Two tabs: Products and Shopping.
- Products tab focuses on catalog management.
- Shopping tab focuses on completion workflow.
- Empty states are shown when lists are empty.

## Future Enhancements
- Duplicate-name handling or merge prompts
- Category and sorting support
- Multi-list support (e.g., weekly plans)
- Data export/import
